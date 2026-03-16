import type { PlotState, AnimalSlot } from '../types';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, GRID_PADDING, GRID_Y_START } from '../constants/grid';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { ANIMAL_PEN_COLS, ANIMAL_CELL_H } from '../constants/game';
import { plotIndexToPixel } from './interaction';
import { updateAndDrawParticles } from './particles';

/* ===== Bright & Playful Palette ===== */
const C = {
  // Grass / background
  grassTop:      '#7BC67E',
  grassBottom:   '#4CAF50',
  grassDash1:    '#6BBF59',
  grassDash2:    '#8DD88A',
  // Wood / fence
  woodDark:      '#8D6E4C',
  woodMid:       '#A68B6B',
  woodLight:     '#C4A882',
  woodHighlight: '#DCC5A0',
  // Soil
  soilTop:       '#C4A06A',
  soilBottom:    '#9B7E50',
  soilFurrow:    'rgba(0,0,0,0.08)',
  soilHighlight: 'rgba(255,255,255,0.12)',
  // UI
  cardBg:        '#FFFFFF',
  cardBorder:    '#E8E0F0',
  accent:        '#4CAF50',
  accentAmber:   '#FF6B35',
  amberLight:    '#FFF3E0',
  amberBorder:   '#FFB74D',
  text1:         '#2D1B4E',
  text2:         '#9E86B8',
  textHint:      '#C4B0D8',
  lockedBg:      '#C8BEB0',
  progressTrack: '#E8E0F0',
  progressFill:  '#4CAF50',
  readyGlow:     'rgba(255, 107, 53, 0.25)',
  hoverBorder:   'rgba(76, 175, 80, 0.5)',
  // Hay / pen
  hayBg:         '#FFF8E1',
  hayLine:       '#FFE082',
};

const GAP = 5;
const INNER = CELL_SIZE - GAP;
const R = 14;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  (ctx as any).roundRect(x, y, w, h, r);
}

/* ===== Cached background ===== */
let bgCache: HTMLCanvasElement | null = null;
let bgCacheW = 0;
let bgCacheH = 0;
let bgCacheSeason = '';

function drawCachedBackground(ctx: CanvasRenderingContext2D, w: number, h: number, season: SeasonId) {
  if (bgCache && bgCacheW === w && bgCacheH === h && bgCacheSeason === season) {
    ctx.drawImage(bgCache, 0, 0);
    return;
  }

  bgCache = document.createElement('canvas');
  bgCache.width = w;
  bgCache.height = h;
  bgCacheW = w;
  bgCacheH = h;
  bgCacheSeason = season;
  const bg = bgCache.getContext('2d')!;

  const sc = SEASON_COLORS[season];

  // Grass gradient
  const grad = bg.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, sc.grassTop);
  grad.addColorStop(1, sc.grassBottom);
  bg.fillStyle = grad;
  bg.fillRect(0, 0, w, h);

  // Procedural grass texture — deterministic small dashes
  const seed = 42;
  for (let i = 0; i < 200; i++) {
    const px = ((seed * (i + 1) * 7919) % (w * 100)) / 100;
    const py = ((seed * (i + 1) * 6271) % (h * 100)) / 100;
    const len = 3 + (i % 5);
    const angle = ((i * 137) % 360) * Math.PI / 180;
    bg.strokeStyle = i % 2 === 0 ? sc.dash1 : sc.dash2;
    bg.lineWidth = 1.5;
    bg.globalAlpha = 0.4 + (i % 3) * 0.15;
    bg.beginPath();
    bg.moveTo(px, py);
    bg.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
    bg.stroke();
  }

  // Winter: add snowflake dots
  if (season === 'winter') {
    bg.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 80; i++) {
      const sx = ((seed * (i + 1) * 3571) % (w * 100)) / 100;
      const sy = ((seed * (i + 1) * 4219) % (h * 100)) / 100;
      const sr = 1 + (i % 3);
      bg.globalAlpha = 0.3 + (i % 4) * 0.1;
      bg.beginPath();
      bg.arc(sx, sy, sr, 0, Math.PI * 2);
      bg.fill();
    }
  }

  bg.globalAlpha = 1;
  ctx.drawImage(bgCache, 0, 0);
}

/* ===== Wooden Fence ===== */
function drawFence(ctx: CanvasRenderingContext2D, farmX: number, farmY: number, farmW: number, farmH: number) {
  const railH = 6;
  const postW = 10;
  const postH = farmH + 20;

  ctx.save();

  // Vertical posts — rounded picket fence style
  const numPosts = Math.floor(farmW / 70) + 1;
  for (let i = 0; i <= numPosts; i++) {
    const px = farmX - 8 + i * (farmW + 16) / numPosts;
    const py = farmY - 10;

    // Post shadow
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    rr(ctx, px - postW / 2 + 2, py + 2, postW, postH, [5, 5, 2, 2]);
    ctx.fill();

    // Post body with gradient
    const postGrad = ctx.createLinearGradient(px - postW / 2, py, px + postW / 2, py);
    postGrad.addColorStop(0, C.woodLight);
    postGrad.addColorStop(0.4, C.woodHighlight);
    postGrad.addColorStop(1, C.woodMid);
    ctx.fillStyle = postGrad;
    rr(ctx, px - postW / 2, py, postW, postH, [5, 5, 2, 2]);
    ctx.fill();

    // Rounded top cap
    ctx.fillStyle = C.woodHighlight;
    ctx.beginPath();
    ctx.arc(px, py, postW / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Top rail with gradient
  const railGrad = ctx.createLinearGradient(farmX, farmY - 4, farmX, farmY - 4 + railH);
  railGrad.addColorStop(0, C.woodHighlight);
  railGrad.addColorStop(1, C.woodMid);
  ctx.fillStyle = railGrad;
  rr(ctx, farmX - 10, farmY - 2, farmW + 20, railH, 3);
  ctx.fill();

  // Bottom rail
  ctx.fillStyle = C.woodMid;
  rr(ctx, farmX - 10, farmY + farmH + 4, farmW + 20, railH, 3);
  ctx.fill();

  // Middle rail
  const midY = farmY + farmH / 2;
  ctx.fillStyle = C.woodLight;
  rr(ctx, farmX - 10, midY, farmW + 20, railH - 1, 3);
  ctx.fill();

  ctx.restore();
}

/* ===== Season Colors ===== */
type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

const SEASON_COLORS: Record<SeasonId, { grassTop: string; grassBottom: string; dash1: string; dash2: string }> = {
  spring: { grassTop: '#7BC67E', grassBottom: '#4CAF50', dash1: '#6BBF59', dash2: '#8DD88A' },
  summer: { grassTop: '#5DAE3B', grassBottom: '#3D8B2A', dash1: '#4E9930', dash2: '#72C44E' },
  autumn: { grassTop: '#C4A04E', grassBottom: '#8B7530', dash1: '#B09040', dash2: '#D4B860' },
  winter: { grassTop: '#D8E8F0', grassBottom: '#B0C8D8', dash1: '#C0D4E0', dash2: '#E8F0F8' },
};

/* ===== Main Draw ===== */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  plots: PlotState[],
  animals: AnimalSlot[],
  hoveredPlot: number | null,
  now: number,
  unlockMap?: Map<number, { cost: number; level: number; playerLevel: number }>,
  _farmName?: string,
  season?: string,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = ctx.canvas.width / dpr;
  const h = ctx.canvas.height / dpr;

  // Grass background (cached, season-aware)
  const sid = (season || 'spring') as SeasonId;
  drawCachedBackground(ctx, w, h, sid);

  // Farm area dimensions
  const farmX = GRID_PADDING;
  const farmY = GRID_Y_START;
  const farmW = GRID_COLS * CELL_SIZE;
  const farmH = GRID_ROWS * CELL_SIZE;

  // Wooden fence around farm plots
  drawFence(ctx, farmX, farmY, farmW, farmH);

  // Draw plots
  for (let i = 0; i < plots.length; i++) {
    drawPlot(ctx, plots[i], i, now, unlockMap?.get(i));
  }

  // Hover — warm glow outline
  if (hoveredPlot !== null && hoveredPlot >= 0 && hoveredPlot < plots.length) {
    const { x, y } = plotIndexToPixel(hoveredPlot);
    const hx = x + GAP / 2;
    const hy = y + GAP / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(62, 142, 65, 0.4)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.5;
    rr(ctx, hx, hy, INNER, INNER, R);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    rr(ctx, hx, hy, INNER, INNER, R);
    ctx.fill();
  }

  // Animal pen
  drawAnimalPen(ctx, animals, now);

  // Particles
  updateAndDrawParticles(ctx);
}

/* ===== Growth Emoji ===== */
function getGrowthStage(cropId: string, progress: number): { emoji: string; size: number; stage: number } {
  const crop = CROPS[cropId as keyof typeof CROPS];
  if (progress < 0.20) return { emoji: '🌰', size: 18, stage: 0 };
  if (progress < 0.40) return { emoji: '🌱', size: 26, stage: 1 };
  if (progress < 0.65) return { emoji: '🌿', size: 32, stage: 2 };
  if (progress < 0.85) return { emoji: crop.emoji, size: 34, stage: 3 };
  if (progress < 1.0)  return { emoji: crop.emoji, size: 38, stage: 4 };
  return { emoji: crop.emoji, size: 44, stage: 5 };
}

/* ===== Decorative drawing helpers ===== */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx + size * 0.15, cy - size * 0.15, cx + size, cy);
  ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.15, cx, cy + size);
  ctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.15, cx - size, cy);
  ctx.quadraticCurveTo(cx - size * 0.15, cy - size * 0.15, cx, cy - size);
  ctx.fill();
  ctx.restore();
}

function drawLeafDeco(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#6BBF59';
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.08, size * 0.6, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSoilMound(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  ctx.fillStyle = 'rgba(90, 65, 35, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, w, w * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(130, 100, 60, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.7, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ===== Progress Bar ===== */
function drawProgress(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  progress: number, color: string,
) {
  // Track with subtle border
  ctx.fillStyle = C.progressTrack;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(42, 30, 18, 0.2)';
  ctx.lineWidth = 0.5;
  rr(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  // Fill
  if (progress > 0) {
    ctx.fillStyle = color;
    const fw = Math.max(h, w * Math.min(1, progress));
    rr(ctx, x, y, fw, h, h / 2);
    ctx.fill();
  }
}

/* ===== Color utility ===== */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

/* ===== Soil helpers ===== */
function drawSoilBed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, C.soilTop);
  grad.addColorStop(1, C.soilBottom);
  ctx.fillStyle = grad;
  rr(ctx, x, y, w, h, R);
  ctx.fill();

  // Furrow lines
  ctx.save();
  rr(ctx, x, y, w, h, R);
  ctx.clip();
  ctx.strokeStyle = C.soilFurrow;
  ctx.lineWidth = 1.5;
  for (let fy = y + 24; fy < y + h - 8; fy += 18) {
    ctx.beginPath();
    ctx.moveTo(x + 14, fy);
    ctx.lineTo(x + w - 14, fy);
    ctx.stroke();
  }
  ctx.strokeStyle = C.soilHighlight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 6);
  ctx.lineTo(x + w - 10, y + 6);
  ctx.stroke();
  ctx.restore();
}

/* ===== Plot ===== */
function drawPlot(ctx: CanvasRenderingContext2D, plot: PlotState, index: number, now: number, unlockInfo?: { cost: number; level: number; playerLevel: number }) {
  const { x: rawX, y: rawY } = plotIndexToPixel(index);
  const x = rawX + GAP / 2;
  const y = rawY + GAP / 2;

  ctx.save();

  switch (plot.status) {
    case 'locked': {
      const grad = ctx.createLinearGradient(x, y, x, y + INNER);
      grad.addColorStop(0, '#8A7E6E');
      grad.addColorStop(1, C.lockedBg);
      ctx.fillStyle = grad;
      rr(ctx, x, y, INNER, INNER, R);
      ctx.fill();

      // Cross pattern
      ctx.save();
      rr(ctx, x, y, INNER, INNER, R);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      for (let d = -INNER; d < INNER * 2; d += 16) {
        ctx.beginPath();
        ctx.moveTo(x + d, y);
        ctx.lineTo(x + d + INNER, y + INNER);
        ctx.stroke();
      }
      ctx.restore();

      const cx = x + INNER / 2;

      ctx.globalAlpha = 0.5;
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', cx, y + INNER * 0.35);
      ctx.globalAlpha = 1;

      if (unlockInfo) {
        const canAfford = unlockInfo.playerLevel >= unlockInfo.level;
        ctx.fillStyle = canAfford ? 'rgba(146, 64, 14, 0.75)' : 'rgba(100, 80, 60, 0.5)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${unlockInfo.cost}💰`, cx, y + INNER * 0.62);

        if (!canAfford) {
          ctx.fillStyle = 'rgba(153, 27, 27, 0.6)';
          ctx.font = '500 9px sans-serif';
          ctx.fillText(`Рів. ${unlockInfo.level}`, cx, y + INNER * 0.78);
        }
      }
      break;
    }

    case 'empty': {
      drawSoilBed(ctx, x, y, INNER, INNER);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '500 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + INNER / 2, y + INNER / 2);
      break;
    }

    case 'growing': {
      const elapsed = (now - plot.plantedAt) / 1000;
      const progress = Math.min(1, elapsed / plot.growthTime);
      const { emoji, size, stage } = getGrowthStage(plot.cropId, progress);
      const cx = x + INNER / 2;
      const emojiY = y + INNER * 0.38;

      // Soil gradient with warm tint as plant grows
      const grad = ctx.createLinearGradient(x, y, x, y + INNER);
      const warmMix = Math.min(0.3, progress * 0.35);
      grad.addColorStop(0, lerpColor(C.soilTop, '#B89860', warmMix));
      grad.addColorStop(1, C.soilBottom);
      ctx.fillStyle = grad;
      rr(ctx, x, y, INNER, INNER, R);
      ctx.fill();

      // Furrow lines fade
      ctx.save();
      rr(ctx, x, y, INNER, INNER, R);
      ctx.clip();
      ctx.globalAlpha = Math.max(0, 1 - progress * 0.9);
      ctx.strokeStyle = C.soilFurrow;
      ctx.lineWidth = 1.5;
      for (let fy = y + 24; fy < y + INNER - 8; fy += 18) {
        ctx.beginPath();
        ctx.moveTo(x + 14, fy);
        ctx.lineTo(x + INNER - 14, fy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      if (stage === 0) {
        drawSoilMound(ctx, cx, emojiY + 10, 14);
      }

      if (stage >= 1) {
        const discR = size * 0.5 + 6;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(cx, emojiY, discR, 0, Math.PI * 2);
        ctx.fill();
      }

      if (stage >= 1) {
        const shadowSize = 8 + stage * 4;
        ctx.fillStyle = `rgba(0,0,0,${0.06 + stage * 0.02})`;
        ctx.beginPath();
        ctx.ellipse(cx, emojiY + size * 0.45, shadowSize, shadowSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const swayAngle = stage >= 2 ? Math.sin(now / 800 + index * 2.3) * 0.06 : 0;
      const scaleBreath = stage >= 1 ? 1 + Math.sin(now / 1200 + index * 1.7) * 0.03 : 1;

      ctx.save();
      ctx.translate(cx, emojiY);
      ctx.rotate(swayAngle);
      ctx.scale(scaleBreath, scaleBreath);
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 0, 0);
      ctx.restore();

      if (stage >= 2 && stage < 5) {
        const leafCount = stage - 1;
        for (let l = 0; l < leafCount; l++) {
          const la = (Math.PI * 2 / leafCount) * l + Math.sin(now / 1000 + l) * 0.15;
          const lr = 18 + stage * 3;
          const lx = cx + Math.cos(la + index) * lr;
          const ly = emojiY + Math.sin(la + index) * lr * 0.6;
          drawLeafDeco(ctx, lx, ly, la + 0.5, 5 + stage, 0.25 + stage * 0.08);
        }
      }

      // Progress bar
      const barW = INNER - 24;
      const barH = 6;
      const barX = x + 12;
      const barY = y + INNER - 18;
      drawProgress(ctx, barX, barY, barW, barH, progress, C.progressFill);

      ctx.fillStyle = C.text2;
      ctx.font = '500 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.floor(progress * 100)}%`, cx, barY - 7);
      break;
    }

    case 'ready': {
      const crop = CROPS[plot.cropId];
      const cx = x + INNER / 2;
      const emojiBaseY = y + INNER * 0.35;

      // Golden-brown soil
      const grad = ctx.createLinearGradient(x, y, x, y + INNER);
      grad.addColorStop(0, '#D4A843');
      grad.addColorStop(0.4, '#C49538');
      grad.addColorStop(0.7, '#A87D30');
      grad.addColorStop(1, '#8B6528');
      ctx.fillStyle = grad;
      rr(ctx, x, y, INNER, INNER, R);
      ctx.fill();

      // Pulsing golden glow border
      const pulse = 0.5 + 0.5 * Math.sin(now / 500);
      ctx.save();
      ctx.shadowColor = `rgba(198, 124, 47, ${0.5 * pulse})`;
      ctx.shadowBlur = 10 + 6 * pulse;
      ctx.strokeStyle = C.accentAmber;
      ctx.lineWidth = 2.5;
      rr(ctx, x, y, INNER, INNER, R);
      ctx.stroke();
      ctx.restore();

      // Orbiting sparkles
      for (let s = 0; s < 4; s++) {
        const starAngle = (now / (600 + s * 100)) + (s * Math.PI / 2);
        const starR = 36 + s * 4;
        const sx = cx + Math.cos(starAngle) * starR;
        const sy = emojiBaseY + Math.sin(starAngle) * starR * 0.5;
        const starAlpha = 0.5 + 0.4 * Math.sin(now / 300 + s * 1.5);
        const starSize = 3 + Math.sin(now / 400 + s) * 1.5;
        drawStar(ctx, sx, sy, starSize, '#FFD700', starAlpha);
      }

      // Shadow beneath bounce
      const bounce = Math.abs(Math.sin(now / 400)) * 6;
      const shadowScale = 1 - bounce / 20;
      ctx.fillStyle = `rgba(0,0,0,${0.1 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(cx, emojiBaseY + 26, 18 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // White disc behind bouncing emoji
      ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.1 * pulse})`;
      ctx.beginPath();
      ctx.arc(cx, emojiBaseY - bounce, 28, 0, Math.PI * 2);
      ctx.fill();

      // Bouncing crop emoji
      const rotWobble = Math.sin(now / 400) * 0.06;
      ctx.save();
      ctx.translate(cx, emojiBaseY - bounce);
      ctx.rotate(rotWobble);
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(crop.emoji, 0, 0);
      ctx.restore();

      // "Зібрати" pill
      const labelAlpha = 0.75 + 0.25 * Math.sin(now / 500);
      const pillW = INNER - 14;
      const pillH = 22;
      const pillX = x + (INNER - pillW) / 2;
      const pillY = y + INNER - pillH - 5;

      ctx.save();
      ctx.shadowColor = 'rgba(180, 120, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = C.accentAmber;
      rr(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.restore();

      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${crop.emoji} Зібрати +${crop.sellPrice}💰`, pillX + pillW / 2, pillY + pillH / 2);
      ctx.globalAlpha = 1;
      break;
    }
  }

  ctx.restore();
}

/* ===== Animal Grouping ===== */
export interface AnimalGroup {
  animalId: AnimalSlot['animalId'];
  count: number;
  readyCount: number;
  slots: AnimalSlot[];
}

export function groupAnimals(animals: AnimalSlot[], now: number): AnimalGroup[] {
  const map = new Map<string, AnimalGroup>();
  for (const slot of animals) {
    let group = map.get(slot.animalId);
    if (!group) {
      group = { animalId: slot.animalId, count: 0, readyCount: 0, slots: [] };
      map.set(slot.animalId, group);
    }
    group.count++;
    group.slots.push(slot);
    const animal = ANIMALS[slot.animalId];
    if ((now - slot.lastCollectedAt) / 1000 >= animal.productionTime) {
      group.readyCount++;
    }
  }
  return Array.from(map.values());
}

/* ===== Animal Pen ===== */
const ACH = ANIMAL_CELL_H; // animal cell height
const ACW = CELL_SIZE;     // animal cell width = same as crop column
const ACGAP = GAP;         // gap between cells
const ACIW = ACW - ACGAP;  // inner width
const ACIH = ACH - ACGAP;  // inner height
const ACR = 12;             // border radius

export function getAnimalPenLayout(_animalCount: number) {
  const gridBottom = GRID_Y_START + GRID_ROWS * CELL_SIZE;
  const penY = gridBottom + 12;
  const labelH = 24;
  const startY = penY + labelH;
  const cols = ANIMAL_PEN_COLS;
  return { penY, labelH, startY, cols, cellW: ACW, cellH: ACH };
}

function drawAnimalPen(ctx: CanvasRenderingContext2D, animals: AnimalSlot[], now: number) {
  const { penY, startY, cols } = getAnimalPenLayout(animals.length);
  const penW = GRID_COLS * CELL_SIZE;
  const penX = GRID_PADDING;

  // Section label
  ctx.fillStyle = C.text1;
  ctx.font = '800 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('🐾 Тварини', penX + 14, penY + 4);

  if (animals.length === 0) {
    ctx.fillStyle = C.textHint;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Купіть тварину на ринку', penX + penW / 2, startY + ACIH / 2);
    return;
  }

  const groups = groupAnimals(animals, now);

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const animal = ANIMALS[group.animalId];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = penX + col * ACW + ACGAP / 2;
    const cellY = startY + row * ACH + ACGAP / 2;

    const isReady = group.readyCount > 0;
    const pulse = isReady ? 0.5 + 0.5 * Math.sin(now / 500) : 0;

    ctx.save();

    // Card shadow
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    rr(ctx, cellX + 2, cellY + 2, ACIW, ACIH, ACR);
    ctx.fill();

    // Card background — warm hay gradient
    const grad = ctx.createLinearGradient(cellX, cellY, cellX, cellY + ACIH);
    if (isReady) {
      grad.addColorStop(0, '#FFF3E0');
      grad.addColorStop(1, '#FFE0B2');
    } else {
      grad.addColorStop(0, '#FFF8E1');
      grad.addColorStop(1, '#FFECB3');
    }
    ctx.fillStyle = grad;
    rr(ctx, cellX, cellY, ACIW, ACIH, ACR);
    ctx.fill();

    // Subtle hay texture — diagonal hatching
    ctx.save();
    rr(ctx, cellX, cellY, ACIW, ACIH, ACR);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.2)';
    ctx.lineWidth = 1;
    for (let d = -ACIW; d < ACIW * 2; d += 14) {
      ctx.beginPath();
      ctx.moveTo(cellX + d, cellY);
      ctx.lineTo(cellX + d + ACIW * 0.5, cellY + ACIH);
      ctx.stroke();
    }
    ctx.restore();

    // Border — glow when ready
    if (isReady) {
      ctx.save();
      ctx.shadowColor = `rgba(255, 107, 53, ${0.4 * pulse})`;
      ctx.shadowBlur = 6 + 4 * pulse;
      ctx.strokeStyle = C.accentAmber;
      ctx.lineWidth = 2;
      rr(ctx, cellX, cellY, ACIW, ACIH, ACR);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#FFD54F';
      ctx.lineWidth = 1.5;
      rr(ctx, cellX, cellY, ACIW, ACIH, ACR);
      ctx.stroke();
    }

    // Layout: emoji left-center, count below, info right
    const emojiCx = cellX + 32;
    const emojiCy = cellY + ACIH * 0.38;
    const bounce = isReady ? Math.abs(Math.sin(now / 400)) * 3 : 0;

    // White disc behind emoji
    ctx.fillStyle = isReady
      ? `rgba(255,255,255,${0.85 + 0.1 * pulse})`
      : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(emojiCx, emojiCy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Animal emoji
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(animal.emoji, emojiCx, emojiCy - bounce);

    // Count label below emoji
    if (group.count > 1) {
      ctx.fillStyle = C.text2;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`×${group.count}`, emojiCx, emojiCy + 20);
    }

    // Right side: product info / progress
    const infoX = cellX + 58;
    const infoW = ACIW - 66;

    if (isReady) {
      // Sparkles around emoji
      for (let s = 0; s < 2; s++) {
        const starAngle = (now / (500 + s * 150)) + s * Math.PI;
        const sr = 24 + s * 3;
        const sx = emojiCx + Math.cos(starAngle) * sr;
        const sy = emojiCy + Math.sin(starAngle) * sr * 0.6;
        drawStar(ctx, sx, sy, 2.5, '#FFD700', 0.4 + 0.4 * Math.sin(now / 300 + s));
      }

      // Collect pill
      const pillH = 20;
      const pillY = emojiCy - pillH / 2;
      const labelAlpha = 0.75 + 0.25 * Math.sin(now / 500);

      ctx.save();
      ctx.shadowColor = 'rgba(180, 120, 0, 0.25)';
      ctx.shadowBlur = 3;
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = C.accentAmber;
      rr(ctx, infoX, pillY, infoW, pillH, pillH / 2);
      ctx.fill();
      ctx.restore();

      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${animal.productEmoji} +${animal.productSellPrice * group.readyCount}💰`,
        infoX + infoW / 2,
        pillY + pillH / 2,
      );
      ctx.globalAlpha = 1;
    } else {
      // Product emoji + time
      let minRemaining = Infinity;
      let totalProgress = 0;
      for (const slot of group.slots) {
        const elapsed = (now - slot.lastCollectedAt) / 1000;
        totalProgress += Math.min(1, elapsed / animal.productionTime);
        const rem = Math.max(0, animal.productionTime - elapsed);
        if (rem < minRemaining) minRemaining = rem;
      }
      const avg = totalProgress / group.count;

      // Product hint + timer
      const mins = Math.floor(minRemaining / 60);
      const secs = Math.floor(minRemaining % 60);
      const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}с`;

      ctx.fillStyle = C.text2;
      ctx.font = '500 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${animal.productEmoji} ${timeStr}`, infoX + infoW / 2, emojiCy - 2);

      // Progress bar
      const barY = emojiCy + 4;
      drawProgress(ctx, infoX, barY, infoW, 5, avg, C.progressFill);
    }

    ctx.restore();
  }
}
