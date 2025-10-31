const CELL_SIZE = 18;
const BASE_SPEED = 6;
const MAX_SNAKES = 4;
const FOOD_COLORS = {
  classic: '#21f89c',
  speed: '#ff008e',
  chroma: '#04f0ff',
  clone: '#ffe066',
};
const FOOD_TYPES = ['classic', 'speed', 'chroma', 'clone'];
const KEY_BINDINGS = {
  ArrowUp: { player: 0, direction: { x: 0, y: -1 } },
  ArrowDown: { player: 0, direction: { x: 0, y: 1 } },
  ArrowLeft: { player: 0, direction: { x: -1, y: 0 } },
  ArrowRight: { player: 0, direction: { x: 1, y: 0 } },
  w: { player: 1, direction: { x: 0, y: -1 } },
  W: { player: 1, direction: { x: 0, y: -1 } },
  s: { player: 1, direction: { x: 0, y: 1 } },
  S: { player: 1, direction: { x: 0, y: 1 } },
  a: { player: 1, direction: { x: -1, y: 0 } },
  A: { player: 1, direction: { x: -1, y: 0 } },
  d: { player: 1, direction: { x: 1, y: 0 } },
  D: { player: 1, direction: { x: 1, y: 0 } },
  ' ': { action: 'toggleTurboHold' },
  Spacebar: { action: 'toggleTurboHold' },
  Space: { action: 'toggleTurboHold' },
};

let snakeIdCounter = 1;

function cloneDirection(dir) {
  return { x: dir.x, y: dir.y };
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function sameCell(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

function createGradientBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(10, 1, 40, 0.95)');
  gradient.addColorStop(0.5, 'rgba(15, 0, 80, 0.9)');
  gradient.addColorStop(1, 'rgba(35, 0, 60, 0.95)');
  return gradient;
}

function buildPulsePattern(cols, rows) {
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);
  const horizontal = [];
  const vertical = [];

  for (let offset = -Math.min(6, centerX - 2); offset <= Math.min(6, cols - centerX - 3); offset++) {
    horizontal.push({ x: centerX + offset, y: centerY - 2 });
    horizontal.push({ x: centerX + offset, y: centerY + 2 });
  }

  for (let offset = -Math.min(6, centerY - 2); offset <= Math.min(6, rows - centerY - 3); offset++) {
    vertical.push({ x: centerX - 2, y: centerY + offset });
    vertical.push({ x: centerX + 2, y: centerY + offset });
  }

  return {
    sets: {
      A: horizontal,
      B: vertical,
    },
    active: 'A',
    timer: 0,
    interval: 12,
  };
}

function randomPaletteColor() {
  const palette = ['#19ffaa', '#ff4fd8', '#08f7fe', '#f5d300'];
  return palette[randomInt(palette.length)];
}

export function initializeSnakeApp({ root }) {
  if (!root) {
    throw new Error('Missing root element for snake app');
  }

  const canvas = root.querySelector('#snakeCanvas');
  const addButton = root.querySelector('[data-snake-control="add"]');
  const removeButton = root.querySelector('[data-snake-control="remove"]');
  const turboToggle = root.querySelector('#snakeTurboToggle');
  const hardToggle = root.querySelector('#snakeHardToggle');
  const foodSelect = root.querySelector('#snakeFoodSelect');
  const obstacleSelect = root.querySelector('#snakeObstacleSelect');
  const scoreValue = root.querySelector('#snakeScoreValue');
  const playersValue = root.querySelector('#snakePlayersValue');
  const speedIndicator = root.querySelector('#snakeSpeedIndicator');
  const difficultyIndicator = root.querySelector('#snakeDifficultyIndicator');
  const aiIndicator = root.querySelector('#snakeAiValue');
  const statusFeed = root.querySelector('#snakeStatusFeed');
  const frame = root.querySelector('.snake-canvas-frame');

  if (!canvas) {
    throw new Error('Snake canvas missing');
  }

  const ctx = canvas.getContext('2d');
  const cleanupFns = [];

  const state = {
    snakes: [],
    foods: [],
    obstacles: [],
    dynamicObstacles: null,
    cols: Math.floor(canvas.width / CELL_SIZE),
    rows: Math.floor(canvas.height / CELL_SIZE),
    running: false,
    turbo: false,
    turboHold: false,
    hardMode: false,
    foodPreference: 'random',
    obstacleType: 'none',
    totalScore: 0,
    lastTickTime: 0,
    animationId: null,
    gradient: null,
  };

  function updateGridMetrics() {
    const bounds = frame?.getBoundingClientRect();
    const fallbackWidth = 640;
    const fallbackHeight = 480;

    let width = Math.floor(bounds?.width || fallbackWidth);
    width = Math.max(320, width);
    let height = bounds?.height ? Math.floor(bounds.height) : Math.floor(width * 0.75);
    height = Math.max(240, height);

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    state.cols = Math.max(12, Math.floor(width / CELL_SIZE));
    state.rows = Math.max(12, Math.floor(height / CELL_SIZE));
    state.gradient = createGradientBackground(ctx, width, height);
  }

  function occupiedCells() {
    const occupied = new Set();
    state.snakes.forEach((snake) => {
      snake.segments.forEach((segment) => occupied.add(cellKey(segment)));
    });
    state.obstacles.forEach((obstacle) => occupied.add(cellKey(obstacle)));
    state.foods.forEach((food) => occupied.add(cellKey(food)));
    if (state.dynamicObstacles) {
      const activeSet = state.dynamicObstacles.sets[state.dynamicObstacles.active] || [];
      activeSet.forEach((cell) => occupied.add(cellKey(cell)));
    }
    return occupied;
  }

  function spawnPosition() {
    const occupied = occupiedCells();
    let attempts = 0;
    while (attempts < 200) {
      const x = randomInt(state.cols);
      const y = randomInt(state.rows);
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        return { x, y };
      }
      attempts += 1;
    }
    return { x: Math.floor(state.cols / 2), y: Math.floor(state.rows / 2) };
  }

  function createSnake({ ai } = { ai: false }) {
    const head = spawnPosition();
    const direction = randomInt(2) === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
    return {
      id: snakeIdCounter++,
      segments: [head],
      direction,
      pendingDirection: cloneDirection(direction),
      color: ai ? '#08f7fe' : '#f72585',
      ai,
      speedBonus: 1,
      boostTimer: 0,
      name: ai ? `Synth Snake ${snakeIdCounter - 1}` : 'Player One',
    };
  }

  function drawGrid() {
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = state.gradient || '#0c0022';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x <= width; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawFood() {
    state.foods.forEach((food) => {
      const x = food.x * CELL_SIZE;
      const y = food.y * CELL_SIZE;
      ctx.fillStyle = FOOD_COLORS[food.type] || '#21f89c';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
      ctx.shadowBlur = 0;
    });
  }

  function obstacleCells() {
    if (state.obstacleType === 'pulse' && state.dynamicObstacles) {
      return state.dynamicObstacles.sets[state.dynamicObstacles.active] || [];
    }
    return state.obstacles;
  }

  function drawObstacles() {
    const obstacles = obstacleCells();
    ctx.fillStyle = 'rgba(255, 0, 128, 0.6)';
    obstacles.forEach((obstacle) => {
      ctx.fillRect(
        obstacle.x * CELL_SIZE + 2,
        obstacle.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4,
      );
    });
  }

  function drawSnakes() {
    state.snakes.forEach((snake) => {
      const huePulse = snake.ai ? 0 : Math.sin(performance.now() / 200) * 20;
      const baseColor = snake.color;
      ctx.fillStyle = baseColor;
      ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
      snake.segments.forEach((segment, index) => {
        const x = segment.x * CELL_SIZE;
        const y = segment.y * CELL_SIZE;
        const size = CELL_SIZE - 3;
        ctx.save();
        ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        ctx.rotate(((index / snake.segments.length) * Math.PI) / 16);
        ctx.translate(-x - CELL_SIZE / 2, -y - CELL_SIZE / 2);
        ctx.fillRect(x + 1.5, y + 1.5, size, size);
        ctx.strokeRect(x + 1.5, y + 1.5, size, size);
        ctx.restore();
      });
    });
  }

  function renderScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawObstacles();
    drawFood();
    drawSnakes();
  }

  function updateHud(message) {
    if (scoreValue) {
      scoreValue.textContent = state.totalScore.toString();
    }
    if (playersValue) {
      playersValue.textContent = state.snakes.length.toString();
    }
    if (speedIndicator) {
      let label = 'Cruise';
      if (state.turbo && !state.turboHold) {
        label = 'Turbo';
      } else if (state.turbo && state.turboHold) {
        label = 'Hold';
      }
      speedIndicator.textContent = `Speed: ${label}`;
    }
    if (difficultyIndicator) {
      difficultyIndicator.textContent = `Boundaries: ${state.hardMode ? 'Solid' : 'Wrap'}`;
    }
    if (aiIndicator) {
      const aiSnakes = state.snakes.filter((snake) => snake.ai).length;
      aiIndicator.textContent = aiSnakes.toString();
    }
    if (message && statusFeed) {
      statusFeed.textContent = message;
    } else if (statusFeed && !statusFeed.textContent) {
      statusFeed.textContent = 'Dial in the controls and unleash the neon serpents.';
    }
  }

  function setStatus(message) {
    updateHud(message);
  }

  function buildCornerObstacles() {
    const cells = [];
    const offsets = [1, 2, 3];
    offsets.forEach((offset) => {
      cells.push({ x: offset, y: offset });
      cells.push({ x: state.cols - 1 - offset, y: offset });
      cells.push({ x: offset, y: state.rows - 1 - offset });
      cells.push({ x: state.cols - 1 - offset, y: state.rows - 1 - offset });
    });
    return cells;
  }

  function buildGridObstacles() {
    const cells = [];
    for (let x = 4; x < state.cols - 4; x += 6) {
      for (let y = 2; y < state.rows - 2; y += 2) {
        cells.push({ x, y });
      }
    }
    return cells;
  }

  function rebuildObstacles(type) {
    state.obstacleType = type;
    state.obstacles = [];
    state.dynamicObstacles = null;

    if (type === 'corner') {
      state.obstacles = buildCornerObstacles();
    } else if (type === 'grid') {
      state.obstacles = buildGridObstacles();
    } else if (type === 'pulse') {
      state.dynamicObstacles = buildPulsePattern(state.cols, state.rows);
    }
  }

  function isObstacle(cell) {
    const list = obstacleCells();
    return list.some((obstacle) => sameCell(obstacle, cell));
  }

  function spawnFood(preferredType) {
    const occupied = occupiedCells();
    const availableTypes = FOOD_TYPES.slice();
    let type = preferredType;

    if (!type || type === 'random') {
      const weights = state.foodPreference === 'random'
        ? [0.45, 0.25, 0.2, 0.1]
        : [0.6, 0.2, 0.15, 0.05];
      const biasIndex = FOOD_TYPES.indexOf(state.foodPreference);
      const randomValue = Math.random();
      let cumulative = 0;
      type = FOOD_TYPES[0];
      for (let index = 0; index < FOOD_TYPES.length; index += 1) {
        const candidate = FOOD_TYPES[index];
        const weighted = state.foodPreference === 'random' ? weights[index] : (index === biasIndex ? 0.45 : 0.1833);
        cumulative += weighted;
        if (randomValue <= cumulative) {
          type = candidate;
          break;
        }
      }
    }

    let attempts = 0;
    while (attempts < 200) {
      const x = randomInt(state.cols);
      const y = randomInt(state.rows);
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        state.foods.push({ x, y, type });
        return;
      }
      attempts += 1;
    }
  }

  function ensureFoodAvailable() {
    const targetCount = Math.min(3, 1 + state.snakes.length);
    while (state.foods.length < targetCount) {
      spawnFood();
    }
  }

  function wrapValue(value, max) {
    if (value < 0) {
      return max - 1;
    }
    if (value >= max) {
      return 0;
    }
    return value;
  }

  function projectNextHead(head, direction) {
    let x = head.x + direction.x;
    let y = head.y + direction.y;

    if (state.hardMode) {
      if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) {
        return null;
      }
      return { x, y };
    }

    x = wrapValue(x, state.cols);
    y = wrapValue(y, state.rows);
    return { x, y };
  }

  function resetSnake(snake) {
    snake.segments = [spawnPosition()];
    snake.direction = { x: 1, y: 0 };
    snake.pendingDirection = { x: 1, y: 0 };
    snake.speedBonus = 1;
    snake.boostTimer = 0;
    if (snake.ai) {
      snake.color = '#08f7fe';
    } else {
      snake.color = '#f72585';
    }
  }

  function handleCollision(snake, message) {
    state.totalScore = Math.max(0, state.totalScore - 25);
    resetSnake(snake);
    setStatus(message || `${snake.name} hit a wall and rebooted.`);
  }

  function applyFoodEffect(food, snake) {
    let message = '';
    state.totalScore += 10;

    if (food.type === 'speed') {
      snake.speedBonus = 1.65;
      snake.boostTimer = 5000;
      message = `${snake.name} engaged turbo boosters!`;
    } else if (food.type === 'chroma') {
      snake.color = randomPaletteColor();
      message = `${snake.name} shifted into a new chroma channel.`;
    } else if (food.type === 'clone') {
      message = `${snake.name} spawned a synth ally.`;
      if (state.snakes.length < MAX_SNAKES) {
        const newSnake = createSnake({ ai: true });
        state.snakes.push(newSnake);
      } else {
        state.totalScore += 15;
      }
    } else {
      message = `${snake.name} gobbled neon bytes.`;
    }

    setStatus(message);
  }

  function isOccupiedBySnake(cell) {
    return state.snakes.some((snake) => snake.segments.some((segment) => sameCell(segment, cell)));
  }

  function handleFoodConsumption(cell, snake) {
    const foodIndex = state.foods.findIndex((food) => sameCell(food, cell));
    if (foodIndex >= 0) {
      const [food] = state.foods.splice(foodIndex, 1);
      applyFoodEffect(food, snake);
      ensureFoodAvailable();
      return true;
    }
    return false;
  }

  function computeAiDirection(snake) {
    if (!snake.ai || state.foods.length === 0) {
      return;
    }
    const head = snake.segments[0];
    const target = state.foods.reduce((closest, food) => {
      if (!closest) return food;
      const currentDistance = Math.abs(food.x - head.x) + Math.abs(food.y - head.y);
      const closestDistance = Math.abs(closest.x - head.x) + Math.abs(closest.y - head.y);
      return currentDistance < closestDistance ? food : closest;
    }, null);

    if (!target) return;

    const dx = target.x - head.x;
    const dy = target.y - head.y;
    const preferred = Math.abs(dx) > Math.abs(dy)
      ? { x: Math.sign(dx), y: 0 }
      : { x: 0, y: Math.sign(dy) };

    const options = [preferred, { x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }, snake.direction];

    for (const option of options) {
      if (!option.x && !option.y) continue;
      if (option.x === -snake.direction.x && option.y === -snake.direction.y) continue;
      const nextCell = projectNextHead(head, option);
      if (!nextCell) continue;
      if (!isObstacle(nextCell) && !isOccupiedBySnake(nextCell)) {
        snake.pendingDirection = option;
        return;
      }
    }
  }

  function advanceSnake(snake, delta) {
    if (!snake) return;

    if (snake.ai) {
      computeAiDirection(snake);
    }

    if (snake.boostTimer > 0) {
      snake.boostTimer -= delta;
      if (snake.boostTimer <= 0) {
        snake.speedBonus = 1;
      }
    }

    const head = snake.segments[0];
    const direction = snake.pendingDirection;
    const nextCell = projectNextHead(head, direction);

    if (!nextCell) {
      handleCollision(snake, `${snake.name} slammed the synthwall.`);
      return;
    }

    if (isObstacle(nextCell)) {
      handleCollision(snake, `${snake.name} crashed into a hazard.`);
      return;
    }

    if (isOccupiedBySnake(nextCell)) {
      handleCollision(snake, `${snake.name} tangled with another serpent.`);
      return;
    }

    snake.segments.unshift(nextCell);
    snake.direction = direction;

    const ateFood = handleFoodConsumption(nextCell, snake);
    if (!ateFood) {
      snake.segments.pop();
    }
  }

  function tick(timestamp) {
    if (!state.running) {
      return;
    }

    if (!state.lastTickTime) {
      state.lastTickTime = timestamp;
    }

    const turboMultiplier = state.turbo && !state.turboHold ? 1.4 : 1;
    const delta = timestamp - state.lastTickTime;
    const interval = (1000 / BASE_SPEED) / turboMultiplier;

    if (delta < interval) {
      state.animationId = requestAnimationFrame(tick);
      return;
    }

    const effectiveDelta = delta;
    state.lastTickTime = timestamp;

    if (state.obstacleType === 'pulse' && state.dynamicObstacles) {
      state.dynamicObstacles.timer += 1;
      if (state.dynamicObstacles.timer >= state.dynamicObstacles.interval) {
        state.dynamicObstacles.timer = 0;
        state.dynamicObstacles.active = state.dynamicObstacles.active === 'A' ? 'B' : 'A';
      }
    }

    ensureFoodAvailable();

    state.snakes.forEach((snake) => {
      const snakeDelta = effectiveDelta / snake.speedBonus;
      advanceSnake(snake, snakeDelta);
    });

    renderScene();
    updateHud();
    state.animationId = requestAnimationFrame(tick);
  }

  function beginLoop() {
    if (state.running) return;
    state.running = true;
    state.lastTickTime = 0;
    renderScene();
    updateHud();
    state.animationId = requestAnimationFrame(tick);
  }

  function haltLoop() {
    state.running = false;
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
  }

  function resetExperience() {
    haltLoop();
    updateGridMetrics();
    state.totalScore = 0;
    state.foods = [];
    state.snakes = [createSnake({ ai: false })];
    state.snakes[0].name = 'Player One';
    if (turboToggle) {
      turboToggle.checked = false;
    }
    if (hardToggle) {
      hardToggle.checked = false;
    }
    state.turbo = false;
    state.turboHold = false;
    state.hardMode = false;
    if (foodSelect) {
      foodSelect.value = 'random';
    }
    if (obstacleSelect) {
      obstacleSelect.value = 'none';
    }
    state.foodPreference = 'random';
    rebuildObstacles('none');
    ensureFoodAvailable();
    renderScene();
    updateHud('Retro grid booted. Ready to roll.');
  }

  function handleKeyDown(event) {
    const binding = KEY_BINDINGS[event.key];
    if (!binding) {
      return;
    }

    if (binding.action === 'toggleTurboHold') {
      if (state.turbo) {
        state.turboHold = !state.turboHold;
        updateHud(state.turboHold ? 'Turbo held. Drift through the beat.' : 'Turbo resumed. Full synth ahead.');
      }
      return;
    }

    const snake = state.snakes[binding.player];
    if (!snake) {
      return;
    }

    const direction = binding.direction;
    if (direction.x === -snake.direction.x && direction.y === -snake.direction.y) {
      return;
    }

    if (snake.ai) {
      snake.ai = false;
      setStatus(`Player ${binding.player + 1} grabbed manual control.`);
    }

    snake.pendingDirection = direction;
  }

  function addSnake(ai = true) {
    if (state.snakes.length >= MAX_SNAKES) {
      setStatus('Snake limit reached. The grid is full.');
      return;
    }
    const newSnake = createSnake({ ai });
    newSnake.name = ai ? `Synth Snake ${state.snakes.length + 1}` : `Player ${state.snakes.length + 1}`;
    state.snakes.push(newSnake);
    ensureFoodAvailable();
    setStatus(`${newSnake.name} beamed in.`);
  }

  function removeSnake() {
    if (state.snakes.length <= 1) {
      setStatus('Need at least one serpent to keep the show going.');
      return;
    }
    const removed = state.snakes.pop();
    setStatus(`${removed.name} faded into the grid.`);
  }

  function attachListeners() {
    const resizeHandler = () => {
      updateGridMetrics();
      renderScene();
    };
    window.addEventListener('resize', resizeHandler);
    cleanupFns.push(() => window.removeEventListener('resize', resizeHandler));

    window.addEventListener('keydown', handleKeyDown);
    cleanupFns.push(() => window.removeEventListener('keydown', handleKeyDown));

    if (addButton) {
      const handler = () => addSnake(true);
      addButton.addEventListener('click', handler);
      cleanupFns.push(() => addButton.removeEventListener('click', handler));
    }

    if (removeButton) {
      const handler = () => removeSnake();
      removeButton.addEventListener('click', handler);
      cleanupFns.push(() => removeButton.removeEventListener('click', handler));
    }

    if (turboToggle) {
      const handler = (event) => {
        state.turbo = event.target.checked;
        state.turboHold = false;
        updateHud(state.turbo ? 'Turbo engaged. Neon trails ignite.' : 'Turbo disengaged. Smooth cruising.');
      };
      turboToggle.addEventListener('change', handler);
      cleanupFns.push(() => turboToggle.removeEventListener('change', handler));
    }

    if (hardToggle) {
      const handler = (event) => {
        state.hardMode = event.target.checked;
        updateHud(state.hardMode ? 'Hard mode: walls are live.' : 'Wrap mode: glide forever.');
      };
      hardToggle.addEventListener('change', handler);
      cleanupFns.push(() => hardToggle.removeEventListener('change', handler));
    }

    if (foodSelect) {
      const handler = (event) => {
        state.foodPreference = event.target.value;
        setStatus(`Food synthesizer tuned to ${event.target.selectedOptions[0].textContent}.`);
      };
      foodSelect.addEventListener('change', handler);
      cleanupFns.push(() => foodSelect.removeEventListener('change', handler));
    }

    if (obstacleSelect) {
      const handler = (event) => {
        rebuildObstacles(event.target.value);
        setStatus(`Obstacle pattern set to ${event.target.selectedOptions[0].textContent}.`);
      };
      obstacleSelect.addEventListener('change', handler);
      cleanupFns.push(() => obstacleSelect.removeEventListener('change', handler));
    }
  }

  updateGridMetrics();
  rebuildObstacles('none');
  resetExperience();
  attachListeners();

  return {
    start() {
      resetExperience();
      beginLoop();
    },
    stop: haltLoop,
    teardown() {
      haltLoop();
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;
    },
  };
}

export default initializeSnakeApp;
