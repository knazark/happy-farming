import { memo, useMemo } from 'react';
import type { PlotState } from '../types';
import { CROPS } from '../constants/crops';

interface PlotCellProps {
  plot: PlotState;
  index: number;
  now: number;
  unlockInfo?: { cost: number; level: number; playerLevel: number; playerCoins: number };
  isHovered: boolean;
  isGreenhouse: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function getGrowthStage(cropId: string, progress: number): { emoji: string; size: number; stage: number } {
  const crop = CROPS[cropId as keyof typeof CROPS];
  if (progress < 0.20) return { emoji: '🌰', size: 18, stage: 0 };
  if (progress < 0.40) return { emoji: '🌱', size: 26, stage: 1 };
  if (progress < 0.65) return { emoji: '🌿', size: 32, stage: 2 };
  if (progress < 0.85) return { emoji: crop.emoji, size: 34, stage: 3 };
  if (progress < 1.0) return { emoji: crop.emoji, size: 38, stage: 4 };
  return { emoji: crop.emoji, size: 44, stage: 5 };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `⏱${mins}:${String(secs).padStart(2, '0')}` : `⏱${secs}с`;
}

export const PlotCell = memo(function PlotCell({
  plot, index, now, unlockInfo, isHovered, isGreenhouse, onClick, onMouseEnter, onMouseLeave,
}: PlotCellProps) {
  const content = useMemo(() => {
    switch (plot.status) {
      case 'locked': {
        const canAfford = unlockInfo
          ? unlockInfo.playerLevel >= unlockInfo.level && unlockInfo.playerCoins >= unlockInfo.cost
          : false;
        return (
          <div className="plot-inner plot-locked">
            <div className="plot-crosshatch" />
            <span className="plot-lock-emoji">🔒</span>
            {unlockInfo && (
              <>
                <span className={`plot-lock-cost ${canAfford ? 'can-afford' : ''}`}>
                  {unlockInfo.cost}💰
                </span>
                {unlockInfo.playerLevel < unlockInfo.level && (
                  <span className="plot-lock-level">Рів. {unlockInfo.level}</span>
                )}
              </>
            )}
          </div>
        );
      }

      case 'empty':
        return (
          <div className="plot-inner plot-empty">
            <div className="plot-furrows" />
            <span className="plot-plus">+</span>
          </div>
        );

      case 'growing': {
        const elapsed = (now - plot.plantedAt) / 1000;
        const progress = Math.min(1, elapsed / plot.growthTime);
        const { emoji, size, stage } = getGrowthStage(plot.cropId, progress);
        const remaining = Math.max(0, plot.growthTime - elapsed);
        const pct = Math.min(100, progress * 100);

        return (
          <div className="plot-inner plot-growing" style={{ '--progress': progress } as React.CSSProperties}>
            <div className="plot-furrows" style={{ opacity: Math.max(0.1, 1 - progress * 0.9) }} />
            {stage === 0 && <div className="plot-soil-mound" />}
            {stage >= 1 && <div className="plot-emoji-disc" />}
            <span
              className={`plot-plant stage-${stage}`}
              style={{ fontSize: `${size}px` }}
            >
              {emoji}
            </span>
            {stage >= 2 && stage < 5 && (
              <div className="plot-leaves" data-count={stage - 1} />
            )}
            <div className="plot-time-pill">{formatTime(remaining)}</div>
            <div className="plot-progress-bar">
              <div className="plot-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }

      case 'ready': {
        const crop = CROPS[plot.cropId];
        return (
          <div className="plot-inner plot-ready">
            <div className="plot-ready-sparkles">
              <span className="sparkle s1">✦</span>
              <span className="sparkle s2">✦</span>
              <span className="sparkle s3">✦</span>
              <span className="sparkle s4">✦</span>
            </div>
            <span className="plot-ready-emoji">{crop.emoji}</span>
            <div className="plot-harvest-pill">
              {crop.emoji} Зібрати +{crop.sellPrice}💰
            </div>
          </div>
        );
      }
    }
  }, [plot, now, unlockInfo, index]);

  const cursor = plot.status === 'growing' ? 'default' : 'pointer';

  return (
    <div
      className={`plot-cell ${isHovered ? 'plot-hovered' : ''} ${isGreenhouse ? 'plot-greenhouse' : ''}`}
      style={{ cursor }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {content}
      {isGreenhouse && <span className="plot-greenhouse-icon">🏗️</span>}
    </div>
  );
});
