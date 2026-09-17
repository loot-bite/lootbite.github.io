const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const INITIAL_TIME = 12;
let timeLeft = INITIAL_TIME;
let timerInterval;
let gameRunning = false;

const tileSize = 40;

const playerImgOpen = new Image();
playerImgOpen.src = "hamburguesa_abierta.svg";

const playerImgClosed = new Image();
playerImgClosed.src = "hamburguesa_cerrada.svg";

let animFrame = 0;

let player = {
  x: 60,
  y: 60,
  radius: 12,
  speed: 2.5,
  dirX: 0,
  dirY: 0,
  nextDirX: 0,
  nextDirY: 0
};

const mazeLayouts = [
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]
];

let currentMap = [];
let dots = [];

function generateMazeAndDots() {
  let layoutIndex = Math.floor(Math.random() * mazeLayouts.length);
  currentMap = JSON.parse(JSON.stringify(mazeLayouts[layoutIndex]));

  let freeTiles = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (currentMap[r][c] === 0) {
        let posX = c * tileSize + tileSize / 2;
        let posY = r * tileSize + tileSize / 2;
        if (Math.hypot(posX - player.x, posY - player.y) > 120) {
          freeTiles.push({ x: posX, y: posY });
        }
      }
    }
  }

  freeTiles.sort(() => Math.random() - 0.5);

  dots = [];
  for (let tile of freeTiles) {
    if (dots.length >= 4) break;
    if (!dots.some(d => Math.hypot(d.x - tile.x, d.y - tile.y) < 80)) {
      dots.push({ x: tile.x, y: tile.y, radius: 5, active: true });
    }
  }
}

// Procesa e intenta mover en la dirección solicitada
function requestDirection(dx, dy) {
  player.nextDirX = dx;
  player.nextDirY = dy;

  // Si está completamente detenido, fuerza el chequeo inmediato
  if (player.dirX === 0 && player.dirY === 0) {
    tryApplyNextDirection();
  }
}

function bindControls(elementId, dx, dy) {
  const btn = document.getElementById(elementId);
  
  const handlePress = (e) => {
    if (e.cancelable) e.preventDefault();
    requestDirection(dx, dy);
  };

  btn.addEventListener("touchstart", handlePress, { passive: false });
  btn.addEventListener("mousedown", handlePress);
}

bindControls("btn-up", 0, -1);
bindControls("btn-down", 0, 1);
bindControls("btn-left", -1, 0);
bindControls("btn-right", 1, 0);

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") requestDirection(0, -1);
  if (e.key === "ArrowDown" || e.key === "s") requestDirection(0, 1);
  if (e.key === "ArrowLeft" || e.key === "a") requestDirection(-1, 0);
  if (e.key === "ArrowRight" || e.key === "d") requestDirection(1, 0);
});

function canMoveTo(x, y) {
  let margin = player.radius - 2;
  let left = Math.floor((x - margin) / tileSize);
  let right = Math.floor((x + margin) / tileSize);
  let top = Math.floor((y - margin) / tileSize);
  let bottom = Math.floor((y + margin) / tileSize);

  return !(
    currentMap[top][left] === 1 ||
    currentMap[top][right] === 1 ||
    currentMap[bottom][left] === 1 ||
    currentMap[bottom][right] === 1
  );
}

function isCenteredOnGrid(axis) {
  const tolerance = 10; // Rango amplio para permitir giros cómodos
  if (axis === 'x') {
    let targetY = Math.floor(player.y / tileSize) * tileSize + tileSize / 2;
    return Math.abs(player.y - targetY) <= tolerance;
  } else {
    let targetX = Math.floor(player.x / tileSize) * tileSize + tileSize / 2;
    return Math.abs(player.x - targetX) <= tolerance;
  }
}

function snapToCenter(axis) {
  if (axis === 'x') {
    player.y = Math.floor(player.y / tileSize) * tileSize + tileSize / 2;
  } else {
    player.x = Math.floor(player.x / tileSize) * tileSize + tileSize / 2;
  }
}

function tryApplyNextDirection() {
  if (player.nextDirX === 0 && player.nextDirY === 0) return;

  if (player.nextDirY !== 0 && isCenteredOnGrid('y')) {
    let testY = player.y + player.nextDirY * player.speed;
    if (canMoveTo(player.x, testY)) {
      snapToCenter('y');
      player.dirX = 0;
      player.dirY = player.nextDirY;
      player.nextDirX = 0;
      player.nextDirY = 0;
    }
  } else if (player.nextDirX !== 0 && isCenteredOnGrid('x')) {
    let testX = player.x + player.nextDirX * player.speed;
    if (canMoveTo(testX, player.y)) {
      snapToCenter('x');
      player.dirX = player.nextDirX;
      player.dirY = 0;
      player.nextDirX = 0;
      player.nextDirY = 0;
    }
  }
}

function checkDots() {
  let remaining = 0;
  for (let dot of dots) {
    if (dot.active) {
      if (Math.hypot(player.x - dot.x, player.y - dot.y) < player.radius + dot.radius) {
        dot.active = false;
      } else {
        remaining++;
      }
    }
  }
  if (remaining === 0) endGame(true);
}

function drawMap() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (currentMap[r][c] === 1) {
        ctx.fillStyle = "#d32f2f";
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        ctx.strokeStyle = "#801010";
        ctx.lineWidth = 2;
        ctx.strokeRect(c * tileSize, r * tileSize, tileSize, tileSize);
      }
    }
  }

  ctx.fillStyle = "#ffee58";
  for (let dot of dots) {
    if (dot.active) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function update() {
  if (!gameRunning) return;

  // Intenta aplicar giro si hay una orden pendiente en el buffer
  tryApplyNextDirection();

  // Moverse en la dirección actual
  let nextX = player.x + player.dirX * player.speed;
  let nextY = player.y + player.dirY * player.speed;

  if (canMoveTo(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
    if (player.dirX !== 0 || player.dirY !== 0) animFrame++;
  } else {
    // Si frena contra la pared, detiene la marcha sin perder posición
    player.dirX = 0;
    player.dirY = 0;
  }

  checkDots();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();

  let currentImg = (Math.floor(animFrame / 10) % 2 === 0) ? playerImgOpen : playerImgClosed;

  ctx.drawImage(
    currentImg,
    player.x - player.radius,
    player.y - player.radius,
    player.radius * 2,
    player.radius * 2
  );

  requestAnimationFrame(update);
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timeLeft > 0 && gameRunning) {
      timeLeft--;
      document.getElementById("time-display").innerText = timeLeft;
    } else if (timeLeft === 0) {
      endGame(false);
    }
  }, 1000);
}

function startGame() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("lose-screen").classList.add("hidden");

  timeLeft = INITIAL_TIME;
  document.getElementById("time-display").innerText = timeLeft;

  player.x = 60;
  player.y = 60;
  player.dirX = 0;
  player.dirY = 0;
  player.nextDirX = 0;
  player.nextDirY = 0;

  generateMazeAndDots();

  gameRunning = true;
  startTimer();
  update();
}

function endGame(isWin) {
  gameRunning = false;
  clearInterval(timerInterval);

  if (isWin) {
    document.getElementById("win-screen").classList.remove("hidden");
  } else {
    document.getElementById("lose-screen").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("lose-screen").classList.add("hidden");
      document.getElementById("start-screen").classList.remove("hidden");
    }, 2000);
  }
}
