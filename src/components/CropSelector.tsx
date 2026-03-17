import { useState } from 'react';
import { motion } from 'framer-motion';
import { CROP_LIST, CROPS } from '../constants/crops';
import { useGame } from '../state/GameContext';
import { SEASON_INFO } from '../constants/seasons';
import { AUTO_PLANTER_MAX_PLOTS } from '../constants/game';
import { showToast } from './Toast';
import type { CropId } from '../types';

interface CropSelectorProps {
  plotIndex: number;
  position: { x: number; y: number };
  onClose: () => void;
}

export function CropSelector({ plotIndex, onClose }: CropSelectorProps) {
  const { state, dispatch } = useGame();
  const plot = state.plots[plotIndex];
  const isGrowing = plot?.status === 'growing';
  // If plot is growing, open in auto-mode only (can't plant on a growing plot)
  const [autoMode, setAutoMode] = useState(isGrowing && state.hasAutoPlanter);
  const currentAutoCrop = plot && 'autoCropId' in plot ? (plot as any).autoCropId as CropId | undefined : undefined;
  const autoCount = state.plots.filter(
    (p, i) => i !== plotIndex && 'autoCropId' in p && (p as any).autoCropId
  ).length;
  const canSetAuto = autoCount < AUTO_PLANTER_MAX_PLOTS;

  const handleSelect = (cropId: CropId) => {
    if (autoMode) {
      if (!canSetAuto && !currentAutoCrop) {
        showToast(`🌾 Максимум ${AUTO_PLANTER_MAX_PLOTS} ділянок для автопосіву`, 'info');
        return;
      }
      dispatch({ type: 'SET_AUTO_CROP', plotIndex, cropId });
      const crop = CROPS[cropId];
      showToast(`🔄 Автопосів: ${crop.emoji} ${crop.name}`, 'earn');
      onClose();
      return;
    }
    const crop = CROPS[cropId];
    showToast(`${crop.emoji} ${crop.name} посаджено! −${crop.seedPrice}💰`, 'spend');
    dispatch({ type: 'PLANT_CROP', plotIndex, cropId });
    onClose();
  };

  const handleClearAuto = () => {
    dispatch({ type: 'CLEAR_AUTO_CROP', plotIndex });
    showToast('🔄 Автопосів вимкнено', 'info');
    onClose();
  };

  return (
    <div className="crop-selector-overlay" onClick={onClose}>
      <motion.div
        className="crop-selector"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <h3 className="crop-selector-title">
          {autoMode ? '🔄 Автопосів' : '🌱 Оберіть культуру'}
        </h3>

        {state.hasAutoPlanter && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!isGrowing && (
              <button
                className={`btn ${!autoMode ? 'btn-buy' : ''}`}
                style={{ fontSize: '13px', padding: '4px 10px' }}
                onClick={() => setAutoMode(false)}
              >
                🌱 Посадити
              </button>
            )}
            <button
              className={`btn ${autoMode ? 'btn-buy' : ''}`}
              style={{ fontSize: '13px', padding: '4px 10px' }}
              onClick={() => setAutoMode(true)}
            >
              🔄 Автопосів ({autoCount}/{AUTO_PLANTER_MAX_PLOTS})
            </button>
            {currentAutoCrop && (
              <button
                className="btn"
                style={{ fontSize: '13px', padding: '4px 10px', color: '#E53935' }}
                onClick={handleClearAuto}
              >
                ❌ Скинути
              </button>
            )}
          </div>
        )}
        <div className="crop-selector-grid-3col">
          {CROP_LIST.map((crop) => {
            const locked = crop.unlockLevel > state.level;
            const wrongSeason = crop.seasonOnly && crop.seasonOnly !== state.season;
            const canAfford = autoMode || state.coins >= crop.seedPrice;
            const disabled = locked || wrongSeason || !canAfford;
            const profit = crop.sellPrice - crop.seedPrice;
            const seasonInfo = crop.seasonOnly ? SEASON_INFO[crop.seasonOnly] : null;
            return (
              <button
                key={crop.id}
                className={`crop-row ${disabled ? 'crop-row-disabled' : ''}`}
                disabled={!!disabled}
                onClick={() => handleSelect(crop.id)}
              >
                <span className="crop-row-emoji">{locked ? '🔒' : crop.emoji}</span>
                <span className="crop-row-info">
                  <span className="crop-row-name">
                    {crop.name}
                    {seasonInfo && <span className="crop-row-season">{seasonInfo.emoji}</span>}
                  </span>
                  {locked ? (
                    <span className="crop-row-meta crop-row-lock">Рівень {crop.unlockLevel}</span>
                  ) : wrongSeason ? (
                    <span className="crop-row-meta crop-row-lock">Тільки {seasonInfo!.emoji} {seasonInfo!.name.toLowerCase()}</span>
                  ) : (
                    <span className="crop-row-meta">
                      ⏱ {crop.growthTime >= 60 ? `${Math.floor(crop.growthTime / 60)}хв${crop.growthTime % 60 ? ` ${crop.growthTime % 60}с` : ''}` : `${crop.growthTime}с`} · 💰 {crop.seedPrice} → {crop.sellPrice}
                      <span className="crop-row-profit"> (+{profit})</span>
                    </span>
                  )}
                </span>
                {!locked && !wrongSeason && (
                  <span className={`crop-row-price ${!canAfford ? 'crop-row-price-no' : ''}`}>
                    {crop.seedPrice}💰
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
