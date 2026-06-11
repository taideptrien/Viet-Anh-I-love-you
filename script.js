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
let isTimeAttackMode = false;
let timeRemaining = 0;
let timerInterval = null;
let currentAttackMinutes = 0;
function formatTime(seconds) {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}
function updateMenuState() {
    const continueBtn = document.getElementById('continue-btn');
    const classicBtnText = document.getElementById('classic-btn-text');
    const timeAttackSection = document.getElementById('time-attack-section');

    if (isGameStarted && !isGameOver) {
        if (continueBtn) continueBtn.style.display = '';
        if (classicBtnText) classicBtnText.innerText = "TRẬN ĐẤU MỚI";
        if (timeAttackSection) timeAttackSection.style.display = 'none';
    } else {
        if (continueBtn) continueBtn.style.display = 'none';
        if (classicBtnText) classicBtnText.innerText = "CHẾ ĐỘ CỔ ĐIỂN";
        if (timeAttackSection) timeAttackSection.style.display = '';
    }
}
function startTimeAttack(minutes) {
    isTimeAttackMode = true;
    currentAttackMinutes = minutes;
    timeRemaining = minutes * 60;

    document.getElementById('timer-display').classList.remove('hidden');
    document.getElementById('time-left').innerText = formatTime(timeRemaining);

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!isPaused && !isGameOver) {
            timeRemaining--;
            document.getElementById('time-left').innerText = formatTime(timeRemaining);

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                isGameOver = true;
                const gameOverScoreElement = document.getElementById('gameover-score') || document.getElementById('final-score');
                if (gameOverScoreElement && typeof player !== 'undefined') {
                    gameOverScoreElement.innerText = player.score;
                }
                document.getElementById('game-over-screen').classList.remove('hidden');
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('timer-display').classList.add('hidden');
    isTimeAttackMode = false;
}
[2, 3, 5, 10].forEach(mins => {
    const btn = document.getElementById(`btn-time-${mins}`);
    if (btn) {
        btn.addEventListener('click', () => {
            const startScreen = document.getElementById('start-screen');
            if (startScreen) {
                startScreen.classList.add('hidden');
                startScreen.style.display = 'none';
            }

            isGameStarted = true;
            isGameOver = false;
            isPaused = false;
            dropInterval = typeof INITIAL_SPEED !== 'undefined' ? INITIAL_SPEED : 1000;

            if (typeof arena !== 'undefined') arena.forEach(row => row.fill(0));
            if (typeof player !== 'undefined') {
                player.score = 0;
                playerReset();
            }
            updateScore();

            // --- THÊM ĐOẠN NÀY ĐỂ ĐỔI LẠI ICON NÚT PAUSE THÀNH 2 VẠCH ---
            const pauseIcon = document.getElementById('pause-icon');
            if (pauseIcon) {
                pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            }
            // --------------------------------------------------------

            startTimeAttack(mins);

            lastTime = performance.now();
            update();
        });
    }
});
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
    if (startScreen && startScreen.style.display !== 'none' && !startScreen.classList.contains('hidden')) {
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
updateMenuState();
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

    // --- THÊM ĐOẠN NÀY ĐỂ ÉP GAME CHẠY TIẾP VÀ ĐỔI ICON PAUSE ---
    isPaused = false;
    const pauseIcon = document.getElementById('pause-icon');
    if (pauseIcon) {
        pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    }
    // --------------------------------------------------------

    drawHold();
    playerReset();
    updateScore();
    lastTime = performance.now();
    update();
});
document.getElementById('play-classic-btn').addEventListener('click', () => {
    if (isGameStarted && !isGameOver) {
        isGameStarted = false;
        isGameOver = false;
        isPaused = false;
        stopTimer();

        if (typeof arena !== 'undefined') arena.forEach(row => row.fill(0));
        if (typeof player !== 'undefined') {
            player.score = 0;
            playerReset();
        }
        updateScore();

        updateMenuState();
    } else {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.add('hidden');
            startScreen.style.display = 'none';
        }
        stopTimer();

        isGameStarted = true;
        isGameOver = false;
        isPaused = false;
        dropInterval = typeof INITIAL_SPEED !== 'undefined' ? INITIAL_SPEED : 1000;

        if (typeof arena !== 'undefined') arena.forEach(row => row.fill(0));
        if (typeof player !== 'undefined') {
            player.score = 0;
            playerReset();
        }
        updateScore();
        const pauseIcon = document.getElementById('pause-icon');
        if (pauseIcon) {
            pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        }

        lastTime = performance.now();
        update();
    }
});
document.getElementById('continue-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    isPaused = false; // Hủy trạng thái pause để game chạy tiếp

    if (isTimeAttackMode) {
        document.getElementById('timer-display').classList.remove('hidden');
    }

    const pauseIcon = document.getElementById('pause-icon');
    if (pauseIcon) pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';

    lastTime = performance.now();
    update();
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
    if (!isGameStarted || isGameOver) return;
    isPaused = true;

    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.remove('hidden');
        startScreen.style.display = '';
    }

    updateMenuState();
});
document.getElementById('game-replay-btn').addEventListener('click', () => {
    // 1. Reset các trạng thái vận hành của game
    isGameStarted = true;
    isGameOver = false;
    isPaused = false;

    // 2. Reset tốc độ rơi về mức ban đầu (tránh việc giữ nguyên tốc độ nhanh của ván trước)
    if (typeof INITIAL_SPEED !== 'undefined') {
        dropInterval = INITIAL_SPEED;
    } else {
        dropInterval = 1000; // Phòng hờ nếu bạn đặt tên biến khác
    }

    // 3. Trả nút Pause về lại icon 2 vạch dọc (Trạng thái đang chơi)
    const pauseIcon = document.getElementById('pause-icon');
    if (pauseIcon) {
        pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    }

    // 4. Dọn sạch bong bàn cờ cũ
    if (typeof arena !== 'undefined') {
        arena.forEach(row => row.fill(0));
    }

    // 5. Khởi tạo lại thông số người chơi và tạo cục gạch mới
    if (typeof player !== 'undefined') {
        player.score = 0;
        if (typeof playerReset === 'function') playerReset();
    }

    // 6. Cập nhật lại điểm số hiển thị trên giao diện màn hình
    if (typeof updateScore === 'function') updateScore();
    if (isTimeAttackMode) {
        startTimeAttack(currentAttackMinutes);
    } else {
        stopTimer();
    }

    // 7. Ép hệ thống vẽ lại bàn cờ trống ngay lập tức
    if (typeof draw === 'function') draw();

    // 8. Mẹo nhỏ: Bỏ focus nút bấm để tránh việc người chơi nhấn Spacebar bị kích hoạt lại nút Replay
    document.getElementById('game-replay-btn').blur();
});
// XÓA ĐOẠN NÀY ĐI ĐỂ TRÁNH XUNG ĐỘT
document.getElementById('gameover-lobby-btn').addEventListener('click', () => {
    isGameStarted = false;
    isGameOver = false;
    dropInterval = INITIAL_SPEED;
    stopTimer();
    document.getElementById('play-classic-btn').innerText = "CHẾ ĐỘ CỔ ĐIỂN";
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
});
function backToLobby() {
    isGameStarted = false;
    isPaused = false;
    isGameOver = false;
    dropInterval = INITIAL_SPEED;
    stopTimer();

    const pauseIcon = document.getElementById('pause-icon');
    if (pauseIcon) {
        pauseIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    }

    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
        gameOverScreen.classList.add('hidden');
    }

    if (typeof arena !== 'undefined') arena.forEach(row => row.fill(0));
    if (typeof player !== 'undefined') {
        player.score = 0;
    }
    updateScore();

    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.remove('hidden');
        startScreen.style.display = '';
    }

    updateMenuState();
}

// KÍCH HOẠT SỰ KIỆN KHI BẤM NÚT VỀ SẢNH TRÊN MÀN HÌNH GAME OVER
document.getElementById('gameover-lobby-btn').addEventListener('click', () => {
    backToLobby();
});
