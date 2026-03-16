import { plotIndexToPixel } from './interaction';
import { CELL_SIZE } from '../constants/grid';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  size: number;
  alpha: number;
  createdAt: number;
  lifetime: number;
  gravity?: number;
  color?: string; // for non-emoji text
  bold?: boolean;
}

const MAX_PARTICLES = 80;
const particles: Particle[] = [];

// Flash overlay state
let flashAlpha = 0;
let flashColor = 'rgba(255, 215, 0, '; // gold

function add(p: Particle) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(p);
}

export function spawnHarvestParticles(plotIndex: number, cropEmoji: string, sellPrice: number) {
  const { x, y } = plotIndexToPixel(plotIndex);
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const now = Date.now();

  // Crop emoji — big, flies up
  add({
    x: cx,
    y: cy - 10,
    vx: 0,
    vy: -2.5,
    text: cropEmoji,
    size: 32,
    alpha: 1,
    createdAt: now,
    lifetime: 900,
    gravity: 0.03,
  });

  // Coin amount — "+25💰" rising above
  add({
    x: cx,
    y: cy - 25,
    vx: 0,
    vy: -1.8,
    text: `+${sellPrice}💰`,
    size: 18,
    alpha: 1,
    createdAt: now + 100,
    lifetime: 1200,
    bold: true,
  });

  // Sparkle burst — 6 small sparkles flying outward
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.3;
    const speed = 1.5 + Math.random() * 1.5;
    add({
      x: cx + (Math.random() - 0.5) * 10,
      y: cy + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      text: '✨',
      size: 12 + Math.random() * 6,
      alpha: 1,
      createdAt: now + i * 30,
      lifetime: 500 + Math.random() * 200,
    });
  }

  // Flash effect
  flashAlpha = 0.25;
  flashColor = 'rgba(255, 215, 0, ';
}

export function spawnPlantParticles(plotIndex: number, cropEmoji: string) {
  const { x, y } = plotIndexToPixel(plotIndex);
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const now = Date.now();

  // Seedling emerging
  add({
    x: cx,
    y: cy + 5,
    vx: 0,
    vy: -1.5,
    text: '🌱',
    size: 22,
    alpha: 0.9,
    createdAt: now,
    lifetime: 600,
  });

  // Dirt puffs
  for (let i = 0; i < 4; i++) {
    add({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + 10,
      vx: (Math.random() - 0.5) * 2,
      vy: -0.5 - Math.random() * 0.8,
      text: '🟤',
      size: 8 + Math.random() * 4,
      alpha: 0.6,
      createdAt: now + i * 50,
      lifetime: 400,
    });
  }

  // Small cost indicator
  add({
    x: cx,
    y: cy - 15,
    vx: 0,
    vy: -1.2,
    text: cropEmoji,
    size: 16,
    alpha: 0.8,
    createdAt: now + 80,
    lifetime: 500,
  });
}

export function spawnCollectParticles(canvasX: number, canvasY: number, productEmoji: string, price: number, count: number) {
  const now = Date.now();

  // Product emoji — big rise
  add({
    x: canvasX,
    y: canvasY - 5,
    vx: 0,
    vy: -2.2,
    text: `${productEmoji}×${count}`,
    size: 20,
    alpha: 1,
    createdAt: now,
    lifetime: 1000,
  });

  // Coin amount
  add({
    x: canvasX,
    y: canvasY - 22,
    vx: 0,
    vy: -1.6,
    text: `+${price * count}💰`,
    size: 16,
    alpha: 1,
    createdAt: now + 120,
    lifetime: 1100,
    bold: true,
  });

  // Small sparkles
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 / 4) * i;
    add({
      x: canvasX,
      y: canvasY,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5,
      text: '✨',
      size: 10 + Math.random() * 4,
      alpha: 0.8,
      createdAt: now + i * 40,
      lifetime: 400,
    });
  }

  // Flash
  flashAlpha = 0.15;
  flashColor = 'rgba(245, 158, 11, ';
}

export function spawnUnlockParticles(plotIndex: number) {
  const { x, y } = plotIndexToPixel(plotIndex);
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const now = Date.now();

  // Unlock burst
  add({
    x: cx, y: cy, vx: 0, vy: -2,
    text: '🔓', size: 28, alpha: 1,
    createdAt: now, lifetime: 800,
  });

  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i;
    add({
      x: cx, y: cy,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      text: '✨', size: 14,
      alpha: 1, createdAt: now + i * 30,
      lifetime: 500,
    });
  }

  flashAlpha = 0.2;
  flashColor = 'rgba(34, 197, 94, ';
}

export function spawnFertilizerParticles(plotIndex: number) {
  const { x, y } = plotIndexToPixel(plotIndex);
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const now = Date.now();

  add({
    x: cx, y: cy, vx: 0, vy: -2,
    text: '🧪', size: 24, alpha: 1,
    createdAt: now, lifetime: 700,
  });

  for (let i = 0; i < 3; i++) {
    add({
      x: cx + (Math.random() - 0.5) * 20,
      y: cy,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1 - Math.random(),
      text: '⚡', size: 12,
      alpha: 0.8, createdAt: now + i * 60,
      lifetime: 500,
    });
  }
}

/* ===== Seasonal Ambient Particles ===== */
interface SeasonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
  wobblePhase: number;
}

const SEASON_EMOJIS: Record<string, string[]> = {
  spring: ['🌸', '🌷', '💮', '🌼'],
  summer: ['🦋', '☀️', '🐝'],
  autumn: ['🍂', '🍁', '🍃', '🍂'],
  winter: ['❄️', '❄️', '❄️', '🌨️'],
};

const MAX_SEASON_PARTICLES = 20;
const seasonParticles: SeasonParticle[] = [];
let currentSeason = '';
let lastSpawnTime = 0;

function spawnSeasonParticle(canvasW: number, season: string) {
  const emojis = SEASON_EMOJIS[season] || SEASON_EMOJIS.spring;
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  const isWinter = season === 'winter';
  const isAutumn = season === 'autumn';

  seasonParticles.push({
    x: Math.random() * canvasW,
    y: -10,
    vx: (Math.random() - 0.5) * (isWinter ? 0.3 : 0.6),
    vy: 0.3 + Math.random() * (isWinter ? 0.4 : isAutumn ? 0.6 : 0.3),
    emoji,
    size: 10 + Math.random() * 8,
    alpha: 0.4 + Math.random() * 0.4,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    wobblePhase: Math.random() * Math.PI * 2,
  });
}

export function updateSeasonalParticles(ctx: CanvasRenderingContext2D, season: string) {
  const dpr = window.devicePixelRatio || 1;
  const w = ctx.canvas.width / dpr;
  const h = ctx.canvas.height / dpr;

  // Reset if season changed
  if (season !== currentSeason) {
    seasonParticles.length = 0;
    currentSeason = season;
  }

  // Spawn new particles periodically
  const now = Date.now();
  if (now - lastSpawnTime > 600 && seasonParticles.length < MAX_SEASON_PARTICLES) {
    spawnSeasonParticle(w, season);
    lastSpawnTime = now;
  }

  // Update & draw
  for (let i = seasonParticles.length - 1; i >= 0; i--) {
    const p = seasonParticles[i];

    // Wobble horizontally
    p.x += p.vx + Math.sin(now / 1000 + p.wobblePhase) * 0.3;
    p.y += p.vy;
    p.rotation += p.rotSpeed;

    // Remove if below canvas
    if (p.y > h + 20) {
      seasonParticles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.font = `${Math.round(p.size)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, 0, 0);
    ctx.restore();
  }
}

export function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
  const now = Date.now();

  // Flash overlay
  if (flashAlpha > 0.01) {
    const dpr = window.devicePixelRatio || 1;
    const w = ctx.canvas.width / dpr;
    const h = ctx.canvas.height / dpr;
    ctx.save();
    ctx.fillStyle = flashColor + flashAlpha + ')';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    flashAlpha *= 0.92; // fade out quickly
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = now - p.createdAt;

    if (age < 0) continue; // delayed start
    if (age > p.lifetime) {
      particles.splice(i, 1);
      continue;
    }

    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) {
      p.vy += p.gravity;
    }

    // Fade out in last 35%
    const fadeStart = p.lifetime * 0.65;
    const alpha = age > fadeStart
      ? Math.max(0, 1 - (age - fadeStart) / (p.lifetime - fadeStart))
      : p.alpha;

    // Scale up then down
    const lifeRatio = age / p.lifetime;
    const scale = lifeRatio < 0.15
      ? 0.5 + lifeRatio / 0.15 * 0.5 // scale in
      : 1 - Math.max(0, (lifeRatio - 0.7)) / 0.3 * 0.3; // scale down at end

    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.bold) {
      ctx.font = `bold ${Math.round(p.size * scale)}px sans-serif`;
    } else {
      ctx.font = `${Math.round(p.size * scale)}px serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow for text readability
    if (p.bold) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3;
    }

    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}
