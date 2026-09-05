const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let timeLeft = 10;
let timerInterval;
let gameRunning = false;

const tileSize = 40; // Matriz 10x10 (400x400 px)

// Carga de imágenes estilo Pixel Art para animación
const playerImgOpen = new Image();
playerImgOpen.src = "hamburguesa_abierta.svg";

const playerImgClosed = new Image();
playerImgClosed.src = "hamburguesa_cerrada.svg";

let animFrame = 0; // Control de fotogramas de la animación

// 5 Plantillas de laberintos estructurados (1 = Muro, 0 = Pasillo)
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
  ],
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 1, 0, 1, 0, 0, 0, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]
];

let currentMap = [];
let dots = [];

let player = {
  x: 60,
  y: 60,
  radius: 12,
  speed: 2.8,
  dirX: 0,
  dirY: 0,
  nextDirX: 0,
  nextDirY: 0
};

// Cargar laberinto aleatorio y distribuir bolitas con distancia mínima
function generateMazeAndDots() {
  let layoutIndex = Math.floor(Math.random() * mazeLayouts.length);
  currentMap = JSON.parse(JSON.stringify(mazeLayouts[layoutIndex]));

  let freeTiles = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (currentMap[r][c] === 0) {
        let posX = c * tileSize + tileSize / 2;
        let posY = r * tileSize + tileSize / 2;
        let distFromPlayer = Math.hypot(posX - player.x, posY - player.y);

        // Bolitas alejadas del inicio del jugador (>120px)
        if (distFromPlayer > 120) {
          freeTiles.push({ x: posX, y: posY });
        }
      }
    }
  }

  freeTiles.sort(() => Math.random() - 0.5);

  dots = [];
  const minDistanceBetweenDots = 100;

  for (let tile of freeTiles) {
    if (dots.length >= 4) break;

    let tooClose = dots.some(d => Math.hypot(d.x - tile.x, d.y - tile.y) < minDistanceBetweenDots);

    if (!tooClose) {
      dots.push({ x: tile.x, y: tile.y, radius: 5, active: true });
    }
  }
}

function setDirection(dir) {
  if (!gameRunning) return;
  if (dir === 'up')    { player.nextDirX = 0;  player.nextDirY = -1; }
  if (dir === 'down')  { player.nextDirX = 0;  player.nextDirY = 1;  }
  if (dir === 'left')  { player.nextDirX = -1; player.nextDirY = 0;  }
  if (dir === 'right') { player.nextDirX = 1;  player.nextDirY = 0;  }
}

// Eventos táctiles y de teclado
document.getElementById("btn-up").addEventListener("touchstart", (e) => { e.preventDefault(); setDirection('up'); });
document.getElementById("btn-down").addEventListener("touchstart", (e) => { e.preventDefault(); setDirection('down'); });
document.getElementById("btn-left").addEventListener("touchstart", (e) => { e.preventDefault(); setDirection('left'); });
document.getElementById("btn-right").addEventListener("touchstart", (e) => { e.preventDefault(); setDirection('right'); });

document.getElementById("btn-up").addEventListener("click", () => setDirection('up'));
document.getElementById("btn-down").addEventListener("click", () => setDirection('down'));
document.getElementById("btn-left").addEventListener("click", () => setDirection('left'));
document.getElementById("btn-right").addEventListener("click", () => setDirection('right'));

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "d") setDirection('right');
  if (e.key === "ArrowLeft" || e.key === "a") setDirection('left');
  if (e.key === "ArrowUp" || e.key === "w") setDirection('up');
  if (e.key === "ArrowDown" || e.key === "s") setDirection('down');
});

// Detector de colisión con muros
function isColliding(x, y) {
  let left = Math.floor((x - player.radius) / tileSize);
  let right = Math.floor((x + player.radius) / tileSize);
  let top = Math.floor((y - player.radius) / tileSize);
  let bottom = Math.floor((y + player.radius) / tileSize);

  return (
    currentMap[top][left] === 1 ||
    currentMap[top][right] === 1 ||
    currentMap[bottom][left] === 1 ||
    currentMap[bottom][right] === 1
  );
}

// Comer puntos y victoria
function checkDots() {
  let remaining = 0;
  for (let dot of dots) {
    if (dot.active) {
      let dist = Math.hypot(player.x - dot.x, player.y - dot.y);
      if (dist < player.radius + dot.radius) {
        dot.active = false;
      } else {
        remaining++;
      }
    }
  }

  if (remaining === 0) {
    endGame(true);
  }
}

// Render del laberinto y bolitas
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

// Bucle principal de renderizado y lógica
function update() {
  if (!gameRunning) return;

  let testX = player.x + player.nextDirX * player.speed;
  let testY = player.y + player.nextDirY * player.speed;
  if (!isColliding(testX, testY)) {
    player.dirX = player.nextDirX;
    player.dirY = player.nextDirY;
  }

  let nextX = player.x + player.dirX * player.speed;
  let nextY = player.y + player.dirY * player.speed;
  if (!isColliding(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
  }

  checkDots();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();

  // Control de animación mediante fotogramas al moverse
  if (player.dirX !== 0 || player.dirY !== 0) {
    animFrame++;
  }

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

  timeLeft = 10;
  document.getElementById("time-display").innerText = timeLeft;

  player = { x: 60, y: 60, radius: 12, speed: 2.8, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0 };
  animFrame = 0;

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

    // Redirección al menú de inicio tras perder
    setTimeout(() => {
      document.getElementById("lose-screen").classList.add("hidden");
      document.getElementById("start-screen").classList.remove("hidden");
    }, 2000);
  }
}