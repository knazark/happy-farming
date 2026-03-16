import { CROP_LIST, CROPS } from '../constants/crops';
import { useGame } from '../state/GameContext';
import { spawnPlantParticles } from '../canvas/particles';
import { showToast } from './Toast';
import type { CropId } from '../types';

interface CropSelectorProps {
  plotIndex: number;
  position: { x: number; y: number };
  onClose: () => void;
}

export function CropSelector({ plotIndex, onClose }: CropSelectorProps) {
  const { state, dispatch } = useGame();

  const handleSelect = (cropId: CropId) => {
    const crop = CROPS[cropId];
    spawnPlantParticles(plotIndex, crop.emoji);
    showToast(`${crop.emoji} ${crop.name} посаджено! −${crop.seedPrice}💰`, 'spend');
    dispatch({ type: 'PLANT_CROP', plotIndex, cropId });
    onClose();
  };

  return (
    <div className="crop-selector-overlay" onClick={onClose}>
      <div
        className="crop-selector"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="crop-selector-title">🌱 Оберіть культуру</h3>
        <div className="crop-selector-list">
          {CROP_LIST.map((crop) => {
            const locked = crop.unlockLevel > state.level;
            const canAfford = state.coins >= crop.seedPrice;
            const disabled = locked || !canAfford;
            const profit = crop.sellPrice - crop.seedPrice;
            return (
              <button
                key={crop.id}
                className={`crop-row ${disabled ? 'crop-row-disabled' : ''}`}
                disabled={disabled}
                onClick={() => handleSelect(crop.id)}
              >
                <span className="crop-row-emoji">{locked ? '🔒' : crop.emoji}</span>
                <span className="crop-row-info">
                  <span className="crop-row-name">{crop.name}</span>
                  {locked ? (
                    <span className="crop-row-meta crop-row-lock">Рівень {crop.unlockLevel}</span>
                  ) : (
                    <span className="crop-row-meta">
                      ⏱ {crop.growthTime >= 60 ? `${Math.floor(crop.growthTime / 60)}хв${crop.growthTime % 60 ? ` ${crop.growthTime % 60}с` : ''}` : `${crop.growthTime}с`} · 💰 {crop.seedPrice} → {crop.sellPrice}
                      <span className="crop-row-profit"> (+{profit})</span>
                    </span>
                  )}
                </span>
                {!locked && (
                  <span className={`crop-row-price ${!canAfford ? 'crop-row-price-no' : ''}`}>
                    {crop.seedPrice}💰
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
