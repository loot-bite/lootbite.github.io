const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const INITIAL_TIME = 10;
let timeLeft = INITIAL_TIME;
let timerInterval;
let gameRunning = false;

const gridCount = 15; // Usamos 15 (número impar) para un laberinto geométricamente perfecto
const tileSize = canvas.width / gridCount;

const playerImgOpen = new Image();
playerImgOpen.src = "hamburguesa_abierta.svg";

const playerImgClosed = new Image();
playerImgClosed.src = "hamburguesa_cerrada.svg";

let animFrame = 0;

let player = {
  x: tileSize * 1.5,
  y: tileSize * 1.5,
  radius: tileSize * 0.28,
  speed: 4.0,
  dirX: 0,
  dirY: 0,
  nextDirX: 0,
  nextDirY: 0
};

let currentMap = [];
let dots = [];

// Generador de laberintos sin zonas aisladas
function generateRandomMaze() {
  let map = Array.from({ length: gridCount }, () => Array(gridCount).fill(1));

  function carve(r, c) {
    map[r][c] = 0;
    const directions = [
      [-2, 0], [2, 0], [0, -2], [0, 2]
    ].sort(() => Math.random() - 0.5);

    for (let [dr, dc] of directions) {
      let nr = r + dr;
      let nc = c + dc;
      if (nr > 0 && nr < gridCount - 1 && nc > 0 && nc < gridCount - 1 && map[nr][nc] === 1) {
        map[r + dr / 2][c + dc / 2] = 0;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);
  return map;
}

// Algoritmo BFS para encontrar ÚNICAMENTE las casillas donde el jugador puede llegar
function getReachableTiles(map, startR, startC) {
  let visited = Array.from({ length: gridCount }, () => Array(gridCount).fill(false));
  let reachable = [];
  let queue = [{ r: startR, c: startC }];
  visited[startR][startC] = true;

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    let curr = queue.shift();
    reachable.push(curr);

    for (let [dr, dc] of dirs) {
      let nr = curr.r + dr;
      let nc = curr.c + dc;

      if (nr >= 0 && nr < gridCount && nc >= 0 && nc < gridCount) {
        if (map[nr][nc] === 0 && !visited[nr][nc]) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  return reachable;
}

function generateMazeAndDots() {
  currentMap = generateRandomMaze();

  // Obtener solo las posiciones 100% accesibles desde el inicio (1, 1)
  let reachable = getReachableTiles(currentMap, 1, 1);

  // Filtrar las que están a suficiente distancia del jugador
  let validTiles = reachable.filter(tile => {
    let posX = tile.c * tileSize + tileSize / 2;
    let posY = tile.r * tileSize + tileSize / 2;
    return Math.hypot(posX - player.x, posY - player.y) > tileSize * 3;
  });

  validTiles.sort(() => Math.random() - 0.5);
  dots = [];

  for (let tile of validTiles) {
    if (dots.length >= 5) break;
    let posX = tile.c * tileSize + tileSize / 2;
    let posY = tile.r * tileSize + tileSize / 2;

    let notTooClose = !dots.some(d => Math.hypot(d.x - posX, d.y - posY) < tileSize * 2);
    if (notTooClose) {
      dots.push({ x: posX, y: posY, radius: tileSize * 0.18, active: true });
    }
  }
}

function requestDirection(dx, dy) {
  player.nextDirX = dx;
  player.nextDirY = dy;
}

function bindControls(elementId, dx, dy) {
  const btn = document.getElementById(elementId);
  btn.addEventListener("touchstart", (e) => { e.preventDefault(); requestDirection(dx, dy); });
  btn.addEventListener("click", () => requestDirection(dx, dy));
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

function canFitAt(x, y) {
  let margin = player.radius;
  let left = Math.floor((x - margin) / tileSize);
  let right = Math.floor((x + margin) / tileSize);
  let top = Math.floor((y - margin) / tileSize);
  let bottom = Math.floor((y + margin) / tileSize);

  if (left < 0 || right >= gridCount || top < 0 || bottom >= gridCount) return false;

  return (
    currentMap[top][left] === 0 &&
    currentMap[top][right] === 0 &&
    currentMap[bottom][left] === 0 &&
    currentMap[bottom][right] === 0
  );
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
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      if (currentMap[r][c] === 1) {
        ctx.fillStyle = "#d32f2f";
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        ctx.strokeStyle = "#801010";
        ctx.lineWidth = 1;
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

  if (player.nextDirX !== 0 || player.nextDirY !== 0) {
    let testX = player.x + player.nextDirX * player.speed;
    let testY = player.y + player.nextDirY * player.speed;

    if (canFitAt(testX, testY)) {
      if (player.nextDirX !== 0) {
        let centerTileY = Math.floor(player.y / tileSize) * tileSize + tileSize / 2;
        if (Math.abs(player.y - centerTileY) < tileSize * 0.4) player.y = centerTileY;
      }
      if (player.nextDirY !== 0) {
        let centerTileX = Math.floor(player.x / tileSize) * tileSize + tileSize / 2;
        if (Math.abs(player.x - centerTileX) < tileSize * 0.4) player.x = centerTileX;
      }

      player.dirX = player.nextDirX;
      player.dirY = player.nextDirY;
      player.nextDirX = 0;
      player.nextDirY = 0;
    }
  }

  let nextX = player.x + player.dirX * player.speed;
  let nextY = player.y + player.dirY * player.speed;

  if (canFitAt(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
    animFrame++;
  } else {
    player.dirX = 0;
    player.dirY = 0;
  }

  checkDots();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();

  let currentImg = (Math.floor(animFrame / 16) % 2 === 0) ? playerImgOpen : playerImgClosed;

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

  player.x = tileSize * 1.5;
  player.y = tileSize * 1.5;
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
