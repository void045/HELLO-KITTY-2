const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("gameOverlay");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const soundToggle = document.getElementById("soundToggle");
const scoreLabel = document.getElementById("scoreLabel");
const bestLabel = document.getElementById("bestLabel");
const shieldLabel = document.getElementById("shieldLabel");
const swordLabel = document.getElementById("swordLabel");
const hintLabel = document.getElementById("hintLabel");

const game = {
  running: false,
  won: false,
  lastTime: 0,
  best: 0,
  camera: { x: 0, y: 0 },
  particles: [],
  effects: [],
  screenShake: 0,
};

const audioState = {
  enabled: true,
  context: null,
};

const input = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  jumpPressed: false,
  attackPressed: false,
};

const skyBands = [
  { y: 0, alpha: 0.2, speed: 12 },
  { y: 120, alpha: 0.18, speed: 20 },
  { y: 245, alpha: 0.12, speed: 28 },
];

const world = {
  width: 960,
  height: 540,
  gravity: 1500,
  solids: [
    { x: 0, y: 470, width: 260, height: 80, type: "ground" },
    { x: 260, y: 500, width: 220, height: 50, type: "ground" },
    { x: 480, y: 470, width: 480, height: 80, type: "ground" },
    { x: 180, y: 390, width: 120, height: 28, type: "cloud" },
    { x: 340, y: 320, width: 140, height: 28, type: "cloud" },
    { x: 540, y: 260, width: 110, height: 28, type: "cloud" },
    { x: 705, y: 205, width: 130, height: 28, type: "cloud" },
    { x: 750, y: 335, width: 30, height: 135, type: "pillar" },
    { x: 130, y: 280, width: 32, height: 110, type: "pillar" },
  ],
  charms: [
    { x: 130, y: 430, kind: "heart", collected: false },
    { x: 225, y: 345, kind: "star", collected: false },
    { x: 390, y: 275, kind: "bow", collected: false },
    { x: 585, y: 215, kind: "star", collected: false },
    { x: 760, y: 160, kind: "heart", collected: false },
    { x: 880, y: 420, kind: "bow", collected: false },
  ],
  candies: [
    { x: 315, y: 452, collected: false },
    { x: 676, y: 424, collected: false },
    { x: 820, y: 158, collected: false },
  ],
  spikes: [
    { x: 292, y: 486, width: 72, height: 18 },
    { x: 640, y: 456, width: 82, height: 18 },
    { x: 786, y: 456, width: 52, height: 18 },
  ],
  traps: [
    { x: 382, y: 306, width: 62, height: 16, phase: 0, active: false },
    { x: 552, y: 246, width: 58, height: 16, phase: 1.8, active: false },
  ],
  sword: {
    x: 520,
    y: 425,
    width: 36,
    height: 36,
    collected: false,
  },
  dragons: [
    {
      x: 604,
      y: 214,
      width: 54,
      height: 38,
      baseX: 604,
      range: 70,
      dir: 1,
      speed: 42,
      alive: true,
      phase: 0.4,
      fireTimer: 1.2,
    },
    {
      x: 812,
      y: 418,
      width: 58,
      height: 42,
      baseX: 812,
      range: 58,
      dir: -1,
      speed: 38,
      alive: true,
      phase: 1.9,
      fireTimer: 2.1,
    },
  ],
  fireballs: [],
  goal: {
    x: 880,
    y: 360,
    width: 46,
    height: 110,
  },
};

const player = {
  x: 70,
  y: 390,
  width: 42,
  height: 48,
  vx: 0,
  vy: 0,
  moveSpeed: 280,
  acceleration: 1700,
  friction: 1800,
  jumpVelocity: -560,
  jumpCut: 0.45,
  maxFallSpeed: 950,
  grounded: false,
  wasGrounded: false,
  coyoteTime: 0.12,
  coyoteTimer: 0,
  jumpBufferTime: 0.14,
  jumpBufferTimer: 0,
  facing: 1,
  wallSliding: false,
  wallDirection: 0,
  wallSlideSpeed: 170,
  spawnX: 70,
  spawnY: 390,
  collected: 0,
  maxJumps: 2,
  jumpsRemaining: 2,
  maxShield: 3,
  shield: 0,
  hasSword: false,
  attackTimer: 0,
  attackCooldownTimer: 0,
  attackDuration: 0.18,
  attackCooldown: 0.32,
  invincibleTimer: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function cameraX(value) {
  return value - game.camera.x;
}

function spawnParticles(x, y, colors, count = 14, power = 180) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(power * 0.35, power);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomRange(20, 90),
      life: randomRange(0.36, 0.8),
      maxLife: 0,
      size: randomRange(2.5, 7),
      color: colors[index % colors.length],
    });
    game.particles[game.particles.length - 1].maxLife =
      game.particles[game.particles.length - 1].life;
  }
}

function spawnRing(x, y, color = "rgba(255, 255, 255, 0.8)", maxRadius = 56) {
  game.effects.push({
    type: "ring",
    x,
    y,
    radius: 8,
    maxRadius,
    life: 0.42,
    maxLife: 0.42,
    color,
  });
}

function updateParticles(deltaTime) {
  for (const particle of game.particles) {
    particle.life -= deltaTime;
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vy += 360 * deltaTime;
    particle.vx *= 0.985;
  }

  game.particles = game.particles.filter((particle) => particle.life > 0);

  for (const effect of game.effects) {
    effect.life -= deltaTime;
    if (effect.type === "ring") {
      effect.radius = lerp(effect.radius, effect.maxRadius, 0.24);
    }
  }

  game.effects = game.effects.filter((effect) => effect.life > 0);
  game.screenShake = Math.max(0, game.screenShake - 42 * deltaTime);
}

function ensureAudio() {
  if (!audioState.enabled) {
    return null;
  }

  if (!audioState.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    audioState.context = new AudioContextClass();
  }

  if (audioState.context.state === "suspended") {
    audioState.context.resume();
  }

  return audioState.context;
}

function playTone({
  type = "sine",
  frequency = 440,
  duration = 0.12,
  volume = 0.03,
  slideTo = null,
  when = 0,
}) {
  const audioContext = ensureAudio();
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + when;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const soundBank = {
  click() {
    playTone({ type: "triangle", frequency: 560, duration: 0.08, volume: 0.03, slideTo: 720 });
  },
  jump() {
    playTone({ type: "triangle", frequency: 340, duration: 0.12, volume: 0.038, slideTo: 520 });
    playTone({ type: "sine", frequency: 680, duration: 0.08, volume: 0.02, when: 0.03, slideTo: 900 });
  },
  doubleJump() {
    playTone({ type: "triangle", frequency: 520, duration: 0.1, volume: 0.034, slideTo: 880 });
    playTone({ type: "sine", frequency: 1040, duration: 0.12, volume: 0.026, when: 0.04, slideTo: 1320 });
  },
  collect() {
    playTone({ type: "sine", frequency: 660, duration: 0.1, volume: 0.03 });
    playTone({ type: "triangle", frequency: 880, duration: 0.12, volume: 0.028, when: 0.05 });
    playTone({ type: "sine", frequency: 1180, duration: 0.14, volume: 0.02, when: 0.1 });
  },
  shield() {
    playTone({ type: "sine", frequency: 420, duration: 0.12, volume: 0.03, slideTo: 640 });
    playTone({ type: "triangle", frequency: 820, duration: 0.16, volume: 0.024, when: 0.08 });
  },
  shieldBlock() {
    playTone({ type: "square", frequency: 260, duration: 0.08, volume: 0.022, slideTo: 180 });
    playTone({ type: "sine", frequency: 920, duration: 0.16, volume: 0.026, when: 0.04, slideTo: 1220 });
  },
  sword() {
    playTone({ type: "sawtooth", frequency: 420, duration: 0.08, volume: 0.018, slideTo: 980 });
    playTone({ type: "triangle", frequency: 1180, duration: 0.08, volume: 0.018, when: 0.05, slideTo: 620 });
  },
  dragon() {
    playTone({ type: "square", frequency: 160, duration: 0.12, volume: 0.022, slideTo: 90 });
    playTone({ type: "triangle", frequency: 720, duration: 0.14, volume: 0.026, when: 0.08, slideTo: 1080 });
  },
  damage() {
    playTone({ type: "sawtooth", frequency: 220, duration: 0.12, volume: 0.025, slideTo: 120 });
    playTone({ type: "square", frequency: 130, duration: 0.09, volume: 0.016, when: 0.08 });
  },
  land() {
    playTone({ type: "sine", frequency: 180, duration: 0.07, volume: 0.018, slideTo: 130 });
  },
  win() {
    playTone({ type: "triangle", frequency: 660, duration: 0.12, volume: 0.03, when: 0.0 });
    playTone({ type: "triangle", frequency: 880, duration: 0.12, volume: 0.03, when: 0.12 });
    playTone({ type: "triangle", frequency: 1100, duration: 0.14, volume: 0.03, when: 0.24 });
    playTone({ type: "sine", frequency: 1320, duration: 0.22, volume: 0.028, when: 0.36 });
  },
  reset() {
    playTone({ type: "triangle", frequency: 320, duration: 0.1, volume: 0.02, slideTo: 220 });
  },
};

function setHint(message) {
  hintLabel.textContent = message;
}

function updateLabels() {
  scoreLabel.textContent = `${player.collected} / ${world.charms.length}`;
  bestLabel.textContent = String(game.best);
  shieldLabel.textContent = String(player.shield);
  swordLabel.textContent = player.hasSword ? "Yes" : "No";
}

function resetWorld() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.wasGrounded = false;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  player.wallSliding = false;
  player.wallDirection = 0;
  player.collected = 0;
  player.jumpsRemaining = player.maxJumps;
  player.shield = 0;
  player.hasSword = false;
  player.attackTimer = 0;
  player.attackCooldownTimer = 0;
  player.invincibleTimer = 0;
  game.won = false;
  game.particles = [];
  game.effects = [];
  game.screenShake = 0;
  input.left = false;
  input.right = false;
  input.jump = false;
  input.attack = false;
  input.jumpPressed = false;
  input.attackPressed = false;

  for (const charm of world.charms) {
    charm.collected = false;
  }

  for (const candy of world.candies) {
    candy.collected = false;
  }

  world.sword.collected = false;
  world.fireballs = [];

  for (const dragon of world.dragons) {
    dragon.x = dragon.baseX;
    dragon.alive = true;
    dragon.fireTimer = 1.1 + dragon.phase;
  }

  updateLabels();
}

function startGame() {
  ensureAudio();
  soundBank.click();
  resetWorld();
  overlay.classList.add("hidden");
  game.running = true;
  game.lastTime = performance.now();
  setHint("Double jump through traps, grab candy shields, and slash dragons with the sword.");
}

function restartGame() {
  soundBank.reset();
  resetWorld();
  overlay.classList.remove("hidden");
  overlay.querySelector("h3").textContent = "Ready for another epic cute run?";
  overlay.querySelector("p").textContent =
    "Candy shields, spikes, dragons, and the sparkly sword reset for a fresh adventure.";
  startButton.textContent = "Start Again";
  game.running = false;
  setHint("Tip: hold jump for height, and release early if you need a shorter hop.");
}

function tryJump() {
  const canGroundJump = player.coyoteTimer > 0;
  const canWallJump = player.wallSliding;
  const canAirJump = !canGroundJump && !canWallJump && player.jumpsRemaining > 0;

  if (!canGroundJump && !canWallJump && !canAirJump) {
    return false;
  }

  if (canWallJump) {
    player.vx = -player.wallDirection * 290;
    player.vy = -500;
    player.jumpsRemaining = player.maxJumps - 1;
    spawnRing(player.x + player.width / 2, player.y + player.height / 2, "rgba(105, 217, 255, 0.75)", 52);
  } else {
    player.vy = canAirJump ? player.jumpVelocity * 0.92 : player.jumpVelocity;
    player.jumpsRemaining = canAirJump
      ? Math.max(0, player.jumpsRemaining - 1)
      : player.maxJumps - 1;
    spawnRing(
      player.x + player.width / 2,
      player.y + player.height,
      canAirJump ? "rgba(255, 216, 107, 0.88)" : "rgba(255, 255, 255, 0.72)",
      canAirJump ? 72 : 48
    );
  }

  player.grounded = false;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  spawnParticles(player.x + player.width / 2, player.y + player.height, ["#ffffff", "#ffd86b", "#ff8fb4"], canAirJump ? 20 : 10, canAirJump ? 260 : 150);
  if (canAirJump) {
    soundBank.doubleJump();
    setHint("Double jump sparkle. You still have tight control in the air.");
  } else {
    soundBank.jump();
  }
  return true;
}

function getAttackBox() {
  const width = 82;
  const height = 54;
  const offsetX = player.facing > 0 ? player.width - 6 : -width + 6;

  return {
    x: player.x + offsetX,
    y: player.y + 2,
    width,
    height,
  };
}

function tryAttack() {
  if (!player.hasSword) {
    setHint("Find the sparkly sword first, then the Slash button will defeat dragons.");
    return;
  }

  if (player.attackCooldownTimer > 0) {
    return;
  }

  player.attackTimer = player.attackDuration;
  player.attackCooldownTimer = player.attackCooldown;
  soundBank.sword();

  const attackBox = getAttackBox();
  const centerX = attackBox.x + attackBox.width / 2;
  const centerY = attackBox.y + attackBox.height / 2;
  spawnRing(centerX, centerY, "rgba(105, 217, 255, 0.8)", 62);
  spawnParticles(centerX, centerY, ["#69d9ff", "#ffffff", "#ffd86b"], 14, 230);

  for (const dragon of world.dragons) {
    if (!dragon.alive || !rectsIntersect(attackBox, dragon)) {
      continue;
    }

    dragon.alive = false;
    game.screenShake = 12;
    soundBank.dragon();
    spawnRing(dragon.x + dragon.width / 2, dragon.y + dragon.height / 2, "rgba(255, 95, 148, 0.95)", 88);
    spawnParticles(dragon.x + dragon.width / 2, dragon.y + dragon.height / 2, ["#ff5f94", "#ffd86b", "#69d9ff", "#ffffff"], 34, 360);
    setHint("Dragon defeated. That sword slash was amazing.");
  }

  world.fireballs = world.fireballs.filter((fireball) => {
    if (!rectsIntersect(attackBox, { x: fireball.x - 9, y: fireball.y - 9, width: 18, height: 18 })) {
      return true;
    }

    spawnParticles(fireball.x, fireball.y, ["#ffd86b", "#ff8fb4", "#ffffff"], 18, 260);
    soundBank.shieldBlock();
    return false;
  });
}

function handleInput(deltaTime) {
  const move = (input.left ? -1 : 0) + (input.right ? 1 : 0);

  if (move !== 0) {
    player.vx += move * player.acceleration * deltaTime;
    player.vx = clamp(player.vx, -player.moveSpeed, player.moveSpeed);
    player.facing = move;
  } else {
    const frictionAmount = player.friction * deltaTime;
    if (Math.abs(player.vx) <= frictionAmount) {
      player.vx = 0;
    } else {
      player.vx -= Math.sign(player.vx) * frictionAmount;
    }
  }

  if (input.jumpPressed) {
    player.jumpBufferTimer = player.jumpBufferTime;
  }

  if (input.attackPressed) {
    tryAttack();
  }
}

function resolveHorizontalCollisions(deltaTime) {
  player.wallSliding = false;
  player.wallDirection = 0;
  player.x += player.vx * deltaTime;

  for (const solid of world.solids) {
    if (!rectsIntersect(player, solid)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = solid.x - player.width;
      player.wallDirection = 1;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.width;
      player.wallDirection = -1;
    }

    player.vx = 0;
  }
}

function resolveVerticalCollisions(deltaTime) {
  player.wasGrounded = player.grounded;
  player.grounded = false;

  player.y += player.vy * deltaTime;
  for (const solid of world.solids) {
    if (!rectsIntersect(player, solid)) {
      continue;
    }

    if (player.vy > 0) {
      player.y = solid.y - player.height;
      player.vy = 0;
      player.grounded = true;
      player.coyoteTimer = player.coyoteTime;
      player.jumpsRemaining = player.maxJumps;
      if (!player.wasGrounded) {
        soundBank.land();
        spawnParticles(player.x + player.width / 2, player.y + player.height, ["#ffffff", "#ffd7e6"], 6, 90);
      }
    } else if (player.vy < 0) {
      player.y = solid.y + solid.height;
      player.vy = 0;
    }
  }

  const touchingWall = player.wallDirection !== 0;
  player.wallSliding = touchingWall && !player.grounded && player.vy > 0;

  if (player.wallSliding) {
    player.vy = Math.min(player.vy, player.wallSlideSpeed);
  }
}

function updatePlayer(deltaTime) {
  handleInput(deltaTime);

  player.attackTimer = Math.max(0, player.attackTimer - deltaTime);
  player.attackCooldownTimer = Math.max(0, player.attackCooldownTimer - deltaTime);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - deltaTime);

  if (player.grounded) {
    player.coyoteTimer = player.coyoteTime;
    player.jumpsRemaining = player.maxJumps;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - deltaTime);
    if (player.coyoteTimer === 0 && player.jumpsRemaining === player.maxJumps) {
      player.jumpsRemaining = player.maxJumps - 1;
    }
  }

  player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - deltaTime);
  if (player.jumpBufferTimer > 0) {
    tryJump();
  }

  player.vy += world.gravity * deltaTime;
  player.vy = clamp(player.vy, -9999, player.maxFallSpeed);

  if (!input.jump && player.vy < 0) {
    player.vy += world.gravity * player.jumpCut * deltaTime;
  }

  resolveHorizontalCollisions(deltaTime);
  resolveVerticalCollisions(deltaTime);

  player.x = clamp(player.x, 0, world.width - player.width);
  if (player.y > world.height + 120) {
    damagePlayer("the cloud gap", player.x + player.width / 2, world.height - 20);
  }
}

function respawnPlayer() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.coyoteTimer = 0;
  player.jumpsRemaining = player.maxJumps;
  player.attackTimer = 0;
  input.left = false;
  input.right = false;
  input.jump = false;
  input.attack = false;
}

function damagePlayer(reason, x, y) {
  if (!game.running || player.invincibleTimer > 0) {
    return;
  }

  game.screenShake = 14;
  player.invincibleTimer = 1.1;
  spawnRing(x, y, "rgba(255, 95, 148, 0.82)", 78);

  if (player.shield > 0) {
    player.shield -= 1;
    soundBank.shieldBlock();
    spawnParticles(x, y, ["#69d9ff", "#ffffff", "#ffd86b"], 26, 320);
    setHint(`Candy shield blocked ${reason}. Shield left: ${player.shield}.`);
    updateLabels();
    return;
  }

  soundBank.damage();
  spawnParticles(x, y, ["#ff5f94", "#51253a", "#ffd86b"], 30, 340);
  respawnPlayer();
  setHint(`Ouch, ${reason}. Bow kitty respawned, but collected charms stay safe.`);
}

function updateCandyAndSword(time) {
  for (const candy of world.candies) {
    if (candy.collected) {
      continue;
    }

    candy.renderY = candy.y + Math.sin(time * 0.004 + candy.x * 0.01) * 5;

    if (
      rectsIntersect(player, {
        x: candy.x - 16,
        y: candy.renderY - 16,
        width: 32,
        height: 32,
      })
    ) {
      candy.collected = true;
      player.shield = Math.min(player.maxShield, player.shield + 1);
      soundBank.shield();
      spawnRing(candy.x, candy.renderY, "rgba(105, 217, 255, 0.82)", 68);
      spawnParticles(candy.x, candy.renderY, ["#69d9ff", "#ffffff", "#ffd86b"], 24, 280);
      setHint(`Candy shield gained. Shield power is now ${player.shield}.`);
      updateLabels();
    }
  }

  if (!world.sword.collected) {
    world.sword.renderY = world.sword.y + Math.sin(time * 0.005) * 7;
    if (
      rectsIntersect(player, {
        x: world.sword.x - world.sword.width / 2,
        y: world.sword.renderY - world.sword.height / 2,
        width: world.sword.width,
        height: world.sword.height,
      })
    ) {
      world.sword.collected = true;
      player.hasSword = true;
      soundBank.sword();
      spawnRing(world.sword.x, world.sword.renderY, "rgba(255, 216, 107, 0.9)", 82);
      spawnParticles(world.sword.x, world.sword.renderY, ["#ffffff", "#ffd86b", "#69d9ff"], 32, 330);
      setHint("Sparkly sword unlocked. Tap Slash to defeat dragons and cut fireballs.");
      updateLabels();
    }
  }
}

function updateCharms(time) {
  for (const charm of world.charms) {
    if (charm.collected) {
      continue;
    }

    if (
      rectsIntersect(player, {
        x: charm.x - 14,
        y: charm.y - 14,
        width: 28,
        height: 28,
      })
    ) {
      charm.collected = true;
      player.collected += 1;
      game.best = Math.max(game.best, player.collected);
      updateLabels();
      soundBank.collect();
      setHint(`So cute. ${player.collected} charm${player.collected === 1 ? "" : "s"} collected.`);
    }
  }

  if (
    player.collected === world.charms.length &&
    !game.won &&
    rectsIntersect(player, world.goal)
  ) {
    game.won = true;
    game.running = false;
    game.best = world.charms.length;
    updateLabels();
    soundBank.win();
    overlay.classList.remove("hidden");
    overlay.querySelector("h3").textContent = "You delivered the love letter.";
    overlay.querySelector("p").textContent =
      "Every charm is collected, the gate is glowing, and the bow kitty absolutely nailed the vibe.";
    startButton.textContent = "Play Again";
    setHint("Perfect run. Try again anytime for another cute little victory.");
  } else if (
    !game.won &&
    rectsIntersect(player, world.goal) &&
    player.collected < world.charms.length
  ) {
    const remaining = world.charms.length - player.collected;
    setHint(`The finish gate needs ${remaining} more charm${remaining === 1 ? "" : "s"} first.`);
  }

  world.charms.forEach((charm, index) => {
    charm.renderY = charm.y + Math.sin(time * 0.003 + index) * 5;
  });
}

function updateHazards(time, deltaTime) {
  for (const spike of world.spikes) {
    if (rectsIntersect(player, spike)) {
      damagePlayer("the sugar spikes", spike.x + spike.width / 2, spike.y);
    }
  }

  for (const trap of world.traps) {
    trap.active = Math.sin(time * 0.006 + trap.phase) > -0.08;
    if (trap.active && rectsIntersect(player, trap)) {
      damagePlayer("a popping candy trap", trap.x + trap.width / 2, trap.y);
    }
  }

  for (const dragon of world.dragons) {
    if (!dragon.alive) {
      continue;
    }

    dragon.x += dragon.dir * dragon.speed * deltaTime;
    if (dragon.x < dragon.baseX - dragon.range || dragon.x > dragon.baseX + dragon.range) {
      dragon.dir *= -1;
    }

    dragon.renderY = dragon.y + Math.sin(time * 0.004 + dragon.phase) * 5;
    dragon.fireTimer -= deltaTime;

    if (dragon.fireTimer <= 0 && Math.abs(player.x - dragon.x) < 380) {
      const targetX = player.x + player.width / 2;
      const targetY = player.y + player.height / 2;
      const startX = dragon.x + dragon.width / 2;
      const startY = dragon.renderY + dragon.height / 2;
      const angle = Math.atan2(targetY - startY, targetX - startX);

      world.fireballs.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * 150,
        vy: Math.sin(angle) * 150,
        life: 3.2,
      });

      dragon.fireTimer = 2.1 + Math.random() * 1.2;
      spawnParticles(startX, startY, ["#ffd86b", "#ff8fb4"], 8, 120);
    }

    if (
      rectsIntersect(player, {
        x: dragon.x,
        y: dragon.renderY,
        width: dragon.width,
        height: dragon.height,
      })
    ) {
      damagePlayer("a baby dragon bump", dragon.x + dragon.width / 2, dragon.renderY + dragon.height / 2);
    }
  }

  for (const fireball of world.fireballs) {
    fireball.life -= deltaTime;
    fireball.x += fireball.vx * deltaTime;
    fireball.y += fireball.vy * deltaTime;
    fireball.vy += 55 * deltaTime;
    spawnParticles(fireball.x, fireball.y, ["rgba(255, 216, 107, 0.75)", "rgba(255, 143, 180, 0.75)"], 1, 28);

    if (
      rectsIntersect(player, {
        x: fireball.x - 9,
        y: fireball.y - 9,
        width: 18,
        height: 18,
      })
    ) {
      fireball.life = 0;
      damagePlayer("dragon candy fire", fireball.x, fireball.y);
    }
  }

  world.fireballs = world.fireballs.filter(
    (fireball) =>
      fireball.life > 0 &&
      fireball.x > -40 &&
      fireball.x < world.width + 40 &&
      fireball.y > -40 &&
      fireball.y < world.height + 40
  );
}

function updateCamera(deltaTime) {
  const targetX = clamp(player.x - world.width * 0.25 + player.vx * 0.08, 0, 0);
  game.camera.x = lerp(game.camera.x, targetX, 6 * deltaTime);
}

function drawBackground(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#8fd9ff");
  skyGradient.addColorStop(0.55, "#ffd9e8");
  skyGradient.addColorStop(1, "#fff1cf");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  skyBands.forEach((band, index) => {
    const offset = (time * 0.01 * band.speed) % canvas.width;
    ctx.globalAlpha = band.alpha;
    ctx.fillStyle = index === 1 ? "#ffffff" : "#fff4f8";
    for (let i = -1; i < 5; i += 1) {
      const x = i * 240 - offset;
      drawCloud(x + 50, band.y + 50 + index * 12, 90 + index * 20);
      drawCloud(x + 170, band.y + 16 + index * 18, 72 + index * 12);
    }
  });
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 41 + time * 0.03) % canvas.width;
    const y = (i * 73 + Math.sin(time * 0.002 + i) * 10) % (canvas.height * 0.55);
    ctx.beginPath();
    ctx.arc(x, y, i % 3 === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.28, Math.PI * 0.9, Math.PI * 0.2, true);
  ctx.arc(x + size * 0.2, y - size * 0.16, size * 0.22, Math.PI, 0, true);
  ctx.arc(x + size * 0.48, y, size * 0.3, Math.PI, Math.PI * 0.2, true);
  ctx.arc(x + size * 0.66, y + size * 0.06, size * 0.22, Math.PI * 1.1, 0, true);
  ctx.closePath();
  ctx.fill();
}

function drawSolid(solid) {
  const x = solid.x - game.camera.x;
  const y = solid.y;
  const radius = solid.type === "pillar" ? 12 : 20;

  ctx.save();
  const gradient = ctx.createLinearGradient(0, y, 0, y + solid.height);
  if (solid.type === "pillar") {
    gradient.addColorStop(0, "#ffd6b7");
    gradient.addColorStop(1, "#ff9bc1");
  } else {
    gradient.addColorStop(0, "#fffefe");
    gradient.addColorStop(1, "#ffd7e6");
  }
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, solid.width, solid.height, radius);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, solid.width - 2, solid.height - 2, radius);
  ctx.stroke();

  ctx.restore();
}

function drawCharm(charm) {
  if (charm.collected) {
    return;
  }

  const x = charm.x - game.camera.x;
  const y = charm.renderY ?? charm.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(255, 196, 222, 0.75)";
  ctx.shadowBlur = 16;

  if (charm.kind === "heart") {
    ctx.fillStyle = "#ff5f94";
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-22, -6, -16, -26, 0, -10);
    ctx.bezierCurveTo(16, -26, 22, -6, 0, 14);
    ctx.fill();
  } else if (charm.kind === "star") {
    ctx.fillStyle = "#ffd86b";
    drawStar(0, 0, 5, 16, 8);
    ctx.fill();
  } else {
    ctx.fillStyle = "#ff81b0";
    ctx.beginPath();
    ctx.ellipse(-8, 0, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.ellipse(8, 0, 12, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd86b";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCandy(candy) {
  if (candy.collected) {
    return;
  }

  const x = cameraX(candy.x);
  const y = candy.renderY ?? candy.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(performance.now() * 0.004 + candy.x) * 0.2);
  ctx.shadowColor = "rgba(105, 217, 255, 0.85)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#69d9ff";
  ctx.beginPath();
  ctx.moveTo(-24, -7);
  ctx.lineTo(-12, -14);
  ctx.lineTo(-12, 14);
  ctx.lineTo(-24, 7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, -7);
  ctx.lineTo(12, -14);
  ctx.lineTo(12, 14);
  ctx.lineTo(24, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -14, -14, 28, 28, 12);
  ctx.fill();
  ctx.fillStyle = "#ff8fb4";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSwordPickup() {
  if (world.sword.collected) {
    return;
  }

  const x = cameraX(world.sword.x);
  const y = world.sword.renderY ?? world.sword.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.65 + Math.sin(performance.now() * 0.005) * 0.08);
  ctx.shadowColor = "rgba(255, 216, 107, 0.9)";
  ctx.shadowBlur = 20;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.strokeStyle = "#69d9ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.lineTo(0, -18);
  ctx.stroke();
  ctx.strokeStyle = "#ffd86b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.lineTo(12, 8);
  ctx.stroke();
  ctx.fillStyle = "#ff8fb4";
  ctx.beginPath();
  ctx.arc(0, 20, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpike(spike) {
  const x = cameraX(spike.x);
  const count = Math.max(3, Math.floor(spike.width / 16));
  const spikeWidth = spike.width / count;

  ctx.save();
  ctx.fillStyle = "#6b3550";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 2;

  for (let index = 0; index < count; index += 1) {
    const sx = x + index * spikeWidth;
    ctx.beginPath();
    ctx.moveTo(sx, spike.y + spike.height);
    ctx.lineTo(sx + spikeWidth / 2, spike.y);
    ctx.lineTo(sx + spikeWidth, spike.y + spike.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawTrap(trap) {
  const x = cameraX(trap.x);

  ctx.save();
  ctx.shadowColor = trap.active ? "rgba(255, 95, 148, 0.85)" : "rgba(255, 216, 107, 0.45)";
  ctx.shadowBlur = trap.active ? 18 : 8;
  ctx.fillStyle = trap.active ? "#ff5f94" : "#ffd86b";
  roundRect(ctx, x, trap.y + (trap.active ? -4 : 4), trap.width, trap.height, 8);
  ctx.fill();

  if (trap.active) {
    ctx.fillStyle = "#ffffff";
    for (let tooth = 0; tooth < 5; tooth += 1) {
      const tx = x + 8 + tooth * 11;
      ctx.beginPath();
      ctx.moveTo(tx, trap.y - 5);
      ctx.lineTo(tx + 5, trap.y + 9);
      ctx.lineTo(tx + 10, trap.y - 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawDragon(dragon) {
  if (!dragon.alive) {
    return;
  }

  const x = cameraX(dragon.x);
  const y = dragon.renderY ?? dragon.y;
  const face = dragon.dir;

  ctx.save();
  ctx.translate(x + dragon.width / 2, y + dragon.height / 2);
  ctx.scale(face, 1);
  ctx.shadowColor = "rgba(255, 95, 148, 0.55)";
  ctx.shadowBlur = 16;

  ctx.fillStyle = "#ff8fb4";
  ctx.beginPath();
  ctx.ellipse(0, 4, 26, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd86b";
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.lineTo(-24, -22);
  ctx.lineTo(-18, 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -5);
  ctx.lineTo(25, -20);
  ctx.lineTo(17, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff6f9e";
  ctx.beginPath();
  ctx.ellipse(20, -3, 17, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(25, -7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#51253a";
  ctx.beginPath();
  ctx.arc(26, -7, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#51253a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -1);
  ctx.lineTo(43, -5);
  ctx.stroke();

  ctx.fillStyle = "#69d9ff";
  for (let horn = 0; horn < 3; horn += 1) {
    ctx.beginPath();
    ctx.moveTo(-14 + horn * 11, -13);
    ctx.lineTo(-8 + horn * 11, -25);
    ctx.lineTo(-2 + horn * 11, -13);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawFireball(fireball) {
  const x = cameraX(fireball.x);
  const gradient = ctx.createRadialGradient(x, fireball.y, 2, x, fireball.y, 16);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#ffd86b");
  gradient.addColorStop(1, "rgba(255, 95, 148, 0.05)");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.shadowColor = "#ff8fb4";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(x, fireball.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoal() {
  const x = world.goal.x - game.camera.x;
  const y = world.goal.y;

  ctx.save();
  const poleGradient = ctx.createLinearGradient(0, y, 0, y + world.goal.height);
  poleGradient.addColorStop(0, "#fff4f7");
  poleGradient.addColorStop(1, "#ffc2d6");
  ctx.fillStyle = poleGradient;
  roundRect(ctx, x, y, 12, world.goal.height, 6);
  ctx.fill();

  const shimmer = player.collected === world.charms.length ? "#fff39a" : "#ffffff";
  ctx.fillStyle = shimmer;
  roundRect(ctx, x + 12, y + 16, 34, 24, 10);
  ctx.fill();
  ctx.strokeStyle = "#ff87b2";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 12, y + 16, 34, 24, 10);
  ctx.stroke();
  ctx.fillStyle = "#ff7aa8";
  ctx.fillRect(x + 23, y + 25, 12, 2.5);
  ctx.restore();
}

function drawPlayer() {
  const x = player.x - game.camera.x;
  const y = player.y;
  const bounce = player.grounded ? 0 : Math.sin(performance.now() * 0.02) * 1.5;
  const flicker = player.invincibleTimer > 0 && Math.floor(performance.now() / 70) % 2 === 0;

  ctx.save();
  ctx.translate(x + player.width / 2, y + player.height / 2 + bounce);
  if (flicker) {
    ctx.globalAlpha = 0.62;
  }

  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, player.height * 0.6, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.shield > 0) {
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.05;
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = "rgba(105, 217, 255, 0.72)";
    ctx.fillStyle = "rgba(105, 217, 255, 0.12)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 2, 34, 39, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = "#fffefc";
  roundRect(ctx, -player.width / 2, -player.height / 2, player.width, player.height, 18);
  ctx.fill();

  ctx.fillStyle = "#ff7aa8";
  ctx.beginPath();
  ctx.ellipse(9, -14, 8, 6, 0.3, 0, Math.PI * 2);
  ctx.ellipse(21, -14, 8, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd86b";
  ctx.beginPath();
  ctx.arc(15, -14, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#35222b";
  ctx.fillRect(-10, -2, 3, 10);
  ctx.fillRect(7, -2, 3, 10);

  ctx.fillStyle = "#ffb9d0";
  ctx.beginPath();
  ctx.arc(0, 7, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(81, 37, 58, 0.55)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-18, 4);
  ctx.moveTo(-6, 12);
  ctx.lineTo(-18, 14);
  ctx.moveTo(6, 8);
  ctx.lineTo(18, 4);
  ctx.moveTo(6, 12);
  ctx.lineTo(18, 14);
  ctx.stroke();

  if (player.hasSword) {
    ctx.save();
    ctx.translate(player.facing * 24, 12);
    ctx.rotate(player.facing * -0.65);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -26);
    ctx.stroke();
    ctx.strokeStyle = "#69d9ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -24);
    ctx.stroke();
    ctx.strokeStyle = "#ffd86b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.restore();
  }

  if (player.attackTimer > 0) {
    const progress = 1 - player.attackTimer / player.attackDuration;
    ctx.save();
    ctx.scale(player.facing, 1);
    ctx.strokeStyle = `rgba(105, 217, 255, ${0.95 - progress * 0.45})`;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(18, 0, 44 + progress * 10, -0.85, 0.85);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 - progress * 0.35})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(18, 0, 33 + progress * 8, -0.75, 0.75);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawEffects() {
  for (const effect of game.effects) {
    if (effect.type !== "ring") {
      continue;
    }

    const alpha = Math.max(0, effect.life / effect.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(cameraX(effect.x), effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cameraX(particle.x), particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  roundRect(ctx, 22, 18, 290, 66, 20);
  ctx.fill();

  ctx.fillStyle = "#d53d6d";
  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.fillText("Bow Kitty Quest", 38, 40);
  ctx.fillStyle = "#51253a";
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText(`Jumps ${player.jumpsRemaining}  Shield ${player.shield}  Sword ${player.hasSword ? "on" : "off"}`, 38, 63);
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawStar(x, y, points, outerRadius, innerRadius) {
  let rotation = Math.PI / 2 * 3;
  const step = Math.PI / points;
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);

  for (let index = 0; index < points; index += 1) {
    ctx.lineTo(x + Math.cos(rotation) * outerRadius, y + Math.sin(rotation) * outerRadius);
    rotation += step;
    ctx.lineTo(x + Math.cos(rotation) * innerRadius, y + Math.sin(rotation) * innerRadius);
    rotation += step;
  }

  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();
}

function render(time) {
  drawBackground(time);
  ctx.save();
  if (game.screenShake > 0) {
    ctx.translate(randomRange(-game.screenShake, game.screenShake), randomRange(-game.screenShake, game.screenShake));
  }
  world.solids.forEach(drawSolid);
  world.spikes.forEach(drawSpike);
  world.traps.forEach(drawTrap);
  world.candies.forEach(drawCandy);
  drawSwordPickup();
  world.fireballs.forEach(drawFireball);
  world.dragons.forEach(drawDragon);
  world.charms.forEach(drawCharm);
  drawGoal();
  drawEffects();
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawHud();
}

function update(time) {
  if (!game.running) {
    render(time);
    input.jumpPressed = false;
    input.attackPressed = false;
    requestAnimationFrame(update);
    return;
  }

  const deltaTime = Math.min((time - game.lastTime) / 1000, 1 / 30);
  game.lastTime = time;

  updatePlayer(deltaTime);
  updateCandyAndSword(time);
  updateCharms(time);
  updateHazards(time, deltaTime);
  updateParticles(deltaTime);
  updateCamera(deltaTime);
  render(time);
  input.jumpPressed = false;
  input.attackPressed = false;
  requestAnimationFrame(update);
}

function setControlState(control, pressed) {
  if (!(control in input)) {
    return;
  }

  if (control === "jump" && pressed && !input.jump) {
    input.jumpPressed = true;
  }

  if (control === "attack" && pressed && !input.attack) {
    input.attackPressed = true;
  }

  input[control] = pressed;
  if (pressed) {
    ensureAudio();
  }
}

function bindControlButton(button) {
  const control = button.dataset.control;

  const press = (event) => {
    event.preventDefault();
    setControlState(control, true);
  };

  const release = (event) => {
    event.preventDefault();
    setControlState(control, false);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
}

document.querySelectorAll("[data-control]").forEach(bindControlButton);

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    setControlState("left", true);
  }
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    setControlState("right", true);
  }
  if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    event.preventDefault();
    setControlState("jump", true);
  }
  if (event.key === "k" || event.key === "K" || event.key === "x" || event.key === "X") {
    setControlState("attack", true);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    setControlState("left", false);
  }
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    setControlState("right", false);
  }
  if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    setControlState("jump", false);
  }
  if (event.key === "k" || event.key === "K" || event.key === "x" || event.key === "X") {
    setControlState("attack", false);
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

soundToggle.addEventListener("click", () => {
  audioState.enabled = !audioState.enabled;
  soundToggle.textContent = audioState.enabled ? "Sounds On" : "Sounds Off";
  if (audioState.enabled) {
    ensureAudio();
    soundBank.click();
    setHint("Cute sounds are back on.");
  } else {
    setHint("Sounds are muted now if you want a quiet play session.");
  }
});

document.querySelectorAll("a, button").forEach((element) => {
  element.addEventListener("click", () => {
    if (element !== soundToggle) {
      soundBank.click();
    }
  });
});

updateLabels();
render(0);
requestAnimationFrame(update);
