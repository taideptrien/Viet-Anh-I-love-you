const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');
holdContext.scale(20, 20);
// Cấu hình tốc độ và độ khó
const INITIAL_SPEED = 1000;   // Tốc độ ban đầu: 1000ms (1 giây rơi 1 ô)
const MAX_SPEED_LIMIT = 150;  // Tốc độ nhanh nhất: 150ms (Nhanh nữa là không kịp nhìn!)
const SCORE_MILESTONE = 500;  // Cứ mỗi 500 điểm sẽ lên một cấp độ mới
const SPEED_DECREMENT = 80;   // Mỗi cấp độ mới sẽ giảm 80ms thời gian chờ của gạch

// Biến dropInterval hiện tại của bạn, hãy gán mặc định bằng INITIAL_SPEED
let dropInterval = INITIAL_SPEED;
function calculateDifficulty() {
    if (typeof player === 'undefined' || typeof player.score === 'undefined') return;

    // Lấy cấp độ hiện tại (Ví dụ: 0 - 499 điểm là cấp 0, 500 - 999 là cấp 1,...)
    const currentLevel = Math.floor(player.score / SCORE_MILESTONE);

    // Tính toán tốc độ rơi mới dựa trên cấp độ
    const newInterval = INITIAL_SPEED - (currentLevel * SPEED_DECREMENT);

    // Giới hạn tốc độ không được vượt quá mức tối đa (nhỏ hơn MAX_SPEED_LIMIT)
    dropInterval = Math.max(newInterval, MAX_SPEED_LIMIT);
}
// Bảng màu giống TETR.IO
const colors = [
    null,
    '#9B59B6', // T - Tím
    '#F1C40F', // O - Vàng
    '#E67E22', // L - Cam
    '#2980B9', // J - Xanh dương
    '#2ECC71', // S - Xanh lá
    '#E74C3C', // Z - Đỏ
    '#3498DB'  // I - Xanh lơ (Cyan)
];
let isPaused = false;
function createPiece(type) {
    if (type === 'T') return [[0, 0, 0], [1, 1, 1], [0, 1, 0]];
    if (type === 'O') return [[2, 2], [2, 2]];
    if (type === 'L') return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
    if (type === 'J') return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
    if (type === 'S') return [[0, 5, 5], [5, 5, 0], [0, 0, 0]];
    if (type === 'Z') return [[6, 6, 0], [0, 6, 6], [0, 0, 0]];
    if (type === 'I') return [[0, 7, 0, 0], [0, 7, 0, 0], [0, 7, 0, 0], [0, 7, 0, 0]];
}

// HÀM MỚI: Vẽ một ô vuông có hiệu ứng 3D (giống ảnh của bạn)
function drawBlock(ctx, x, y, color, isGhost = false) {
    if (isGhost) {
        // Vẽ bóng ma (chỉ có viền mờ)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.1;
        ctx.strokeRect(x + 0.05, y + 0.05, 0.9, 0.9);
        return;
    }

    // Nền tối ở ngoài
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);

    // Hình vuông sáng bên trong tạo hiệu ứng dập nổi 3D
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 0.15, y + 0.15, 0.7, 0.7);

    // Viền đen ngăn cách các khối
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x, y, 1, 1);
}

function drawMatrix(matrix, offset, ctx, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(ctx, x + offset.x, y + offset.y, colors[value], isGhost);
            }
        });
    });
}

function drawGrid() {
    context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    context.lineWidth = 0.05;
    for (let x = 0; x <= arena[0].length; x++) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, arena.length); context.stroke();
    }
    for (let y = 0; y <= arena.length; y++) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(arena[0].length, y); context.stroke();
    }
}
function drawGhost() {
    const ghost = { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y } };
    while (!collide(arena, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    drawMatrix(ghost.matrix, ghost.pos, context, true);
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawMatrix(arena, { x: 0, y: 0 }, context);
    drawGhost();
    drawMatrix(player.matrix, player.pos, context);
}

function drawNext() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextPieces.forEach((matrix, index) => {
        const offsetX = (4 - matrix[0].length) / 2;
        const offsetY = index * 4 + 1;
        drawMatrix(matrix, { x: offsetX, y: offsetY }, nextContext);
    });
}

function drawHold() {
    holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        const offsetX = (4 - holdPiece[0].length) / 2;
        const offsetY = (4 - holdPiece.length) / 2;
        drawMatrix(holdPiece, { x: offsetX, y: offsetY }, holdContext);
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

// Khởi tạo hàng đợi khối (Chứa 4 khối xem trước)
let nextPieces = [];
const pieces = 'TJLOSZI';
function getRandomPiece() {
    return createPiece(pieces[pieces.length * Math.random() | 0]);
}
while (nextPieces.length < 4) nextPieces.push(getRandomPiece());

function playerReset() {
    player.matrix = nextPieces.shift();
    nextPieces.push(getRandomPiece());
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        showGameOver();
    } else {
        canHold = true;
        drawNext();
    }
}

// TÍNH NĂNG MỚI: Hard Drop (Rơi thẳng đứng)
function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--; // Chạm đáy thì lùi lên 1 ô
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    for (let y = 0; y < player.matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [player.matrix[x][y], player.matrix[y][x]] = [player.matrix[y][x], player.matrix[x][y]];
        }
    }
    if (dir > 0) player.matrix.forEach(row => row.reverse());
    else player.matrix.reverse();

    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            playerRotate(-dir); // Hoàn tác
            player.pos.x = pos;
            return;
        }
    }
}

// TÍNH NĂNG MỚI: Hold (Giữ khối)
let holdPiece = null;
let canHold = true;

function playerHold() {
    if (!canHold) return;
    if (holdPiece === null) {
        holdPiece = player.matrix;
        playerReset();
    } else {
        const temp = player.matrix;
        player.matrix = holdPiece;
        holdPiece = temp;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    }
    canHold = false;
    drawHold();
}

function arenaSweep() {
    let linesCleared = 0;

    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        linesCleared++;
    }

    if (linesCleared > 0) {
        let basePoints = 0;
        if (linesCleared === 1) basePoints = 100;
        else if (linesCleared === 2) basePoints = 300;
        else if (linesCleared === 3) basePoints = 500;
        else if (linesCleared === 4) basePoints = 800;

        player.combo++;
        player.comboGrace = 3;
        player.score += basePoints + (player.combo > 0 ? player.combo * 50 : 0);

        const isArenaEmpty = arena.every(row => row.every(value => value === 0));
        if (isArenaEmpty) {
            player.score += 3000;
        }
    } else {
        if (player.combo > -1) {
            player.comboGrace--;
            if (player.comboGrace <= 0) {
                player.combo = -1;
            }
        }
    }
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
    calculateDifficulty();
    const comboEl = document.getElementById('combo-display');
    if (player.combo > 0) {
        comboEl.innerText = `COMBO x${player.combo}`;
        comboEl.style.opacity = "1";
    } else {
        comboEl.innerText = "";
    }
}


document.addEventListener('keydown', event => {
    const startScreen = document.getElementById('start-screen');
    if (startScreen && !startScreen.classList.contains('hidden')) {
        return;
    }
    if (isGameOver) return;
    const key = event.key.toLowerCase();
    if (key === 'p' || key === 'escape') {
        togglePause();
        return;
    }
    if (isPaused) return;
    if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(key) > -1) {
        event.preventDefault();
    }
    if (key === 'arrowleft') playerMove(-1);
    else if (key === 'arrowright') playerMove(1);
    else if (key === 'arrowdown') playerDrop();
    else if (key === 'arrowup' || key === 'r') playerRotate(1);
    else if (key === ' ' || key === 'spacebar') playerHardDrop();
    else if (key === 'c' || key === 'shift') playerHold();
});

let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
    if (isGameOver) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    if (!isPaused) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

// Khởi tạo ma trận
function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

const arena = createMatrix(10, 20);
const player = { pos: { x: 0, y: 0 }, matrix: null, score: 0, combo: -1, comboGrace: 0 };
let isGameOver = false;
let isGameStarted = false;

playerReset();
updateScore();
update();
function showGameOver() {
    isGameOver = true;
    document.getElementById('final-score').innerText = player.score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.combo = -1;
    player.comboGrace = 0;
    holdPiece = null;
    canHold = true;
    isGameOver = false;
    drawHold();
    playerReset();
    updateScore();
    lastTime = performance.now();
    update();
});
document.getElementById('play-classic-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');

    if (!isGameStarted) {
        isGameStarted = true;
        isGameOver = false;
        isPaused = false;

        // RESET TỐC ĐỘ VỀ BAN ĐẦU KHI CHƠI VÁN MỚI
        dropInterval = INITIAL_SPEED;

        if (typeof arena !== 'undefined') arena.forEach(row => row.fill(0));
        if (typeof player !== 'undefined') {
            player.score = 0;
            playerReset();
        }
        updateScore(); // Hàm này chạy sẽ tự gọi calculateDifficulty() để thiết lập lại

        lastTime = performance.now();
        update();
    } else {
        isPaused = true;
        const pauseIcon = document.getElementById('pause-icon');
        if (pauseIcon) pauseIcon.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
        draw();
    }
});
function togglePause() {
    if (isGameOver) return;

    isPaused = !isPaused;
    const pauseIcon = document.getElementById('pause-icon');

    if (isPaused) {
        pauseIcon.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
    } else {
        pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    }
}
document.getElementById('pause-btn').addEventListener('click', () => {
    togglePause();
    document.getElementById('pause-btn').blur();
});
document.getElementById('home-btn').addEventListener('click', () => {
    // Chỉ hoạt động khi game đang trong trận và chưa bị Game Over
    if (isGameStarted && !isGameOver) {
        isPaused = true; // Đóng băng không cho gạch rơi tiếp

        // Thay đổi chữ ở nút ngoài sảnh chờ để người chơi biết là bấm vào sẽ chơi tiếp
        document.getElementById('play-classic-btn').innerText = "TIẾP TỤC TRẬN ĐẤU";

        // Hiện màn hình sảnh chờ lên
        document.getElementById('start-screen').classList.remove('hidden');

        document.getElementById('home-btn').blur(); // Bỏ focus nút để tránh lỗi nhấn Spacebar
    }
});
document.getElementById('gameover-lobby-btn').addEventListener('click', () => {
    isGameStarted = false;
    isGameOver = false;

    // RESET TỐC ĐỘ VỀ MẶC ĐỊNH
    dropInterval = INITIAL_SPEED;

    document.getElementById('play-classic-btn').innerText = "CHẾ ĐỘ CỔ ĐIỂN";
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
});
function backToLobby() {
    // 1. Đặt lại trạng thái hệ thống - THÊM dòng reset isGameOver ở đây
    isGameStarted = false;
    isPaused = false;
    isGameOver = false; // <-- THÊM DÒNG NÀY ĐỂ XÓA TRẠNG THÁI THUA CỦA VÁN TRƯỚC

    // 2. Trả nút Pause góc màn hình về lại icon ban đầu
    const pauseIcon = document.getElementById('pause-icon');
    if (pauseIcon) {
        pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    }

    // 3. Ẩn màn hình Game Over
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
        gameOverScreen.classList.add('hidden');
    }

    // 4. Reset sạch sẽ dữ liệu bàn cờ cũ và điểm số
    if (typeof arena !== 'undefined') arena.forEach(row => row.fill(0));
    if (typeof player !== 'undefined') {
        player.score = 0;
        // Nếu code của bạn dùng tên biến khác như score = 0 thì sửa cho đúng nhé
    }
    updateScore();

    // 5. Hiện lại màn hình chờ sảnh chính
    document.getElementById('start-screen').classList.remove('hidden');
}

// KÍCH HOẠT SỰ KIỆN KHI BẤM NÚT VỀ SẢNH TRÊN MÀN HÌNH GAME OVER
document.getElementById('gameover-lobby-btn').addEventListener('click', () => {
    backToLobby();
});
