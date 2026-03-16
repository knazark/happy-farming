import { CROP_LIST, CROPS } from '../constants/crops';
import { useGame } from '../state/GameContext';
import { SEASON_INFO } from '../constants/seasons';
import { spawnPlantParticles } from '../canvas/particles';
import { showToast } from './Toast';
import type { CropId } from '../types';

interface CropSelectorProps {
  plotIndex: number;
  position: { x: number; y: number };
  onClose: () => void;
  isBottomRow?: boolean;
}

export function CropSelector({ plotIndex, onClose, isBottomRow }: CropSelectorProps) {
  const { state, dispatch } = useGame();
  const isGreenhousePlot = state.hasGreenhouse && isBottomRow;

  const handleSelect = (cropId: CropId) => {
    const crop = CROPS[cropId];
    spawnPlantParticles(plotIndex, crop.emoji);
    showToast(`${crop.emoji} ${crop.name} посаджено! −${crop.seedPrice}💰`, 'spend');
    dispatch({ type: 'PLANT_CROP', plotIndex, cropId });
    onClose();
  };

  const isWinter = state.season === 'winter';

  if (isWinter && !isGreenhousePlot) {
    return (
      <div className="crop-selector-overlay" onClick={onClose}>
        <div className="crop-selector" onClick={(e) => e.stopPropagation()}>
          <h3 className="crop-selector-title">❄️ Зима</h3>
          <p style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
            Взимку не можна садити рослини!<br />
            {state.hasGreenhouse
              ? 'Садіть на нижньому рядку — теплиця працює! 🏗️'
              : 'Зачекайте на весну 🌸'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="crop-selector-overlay" onClick={onClose}>
      <div
        className="crop-selector"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="crop-selector-title">{isGreenhousePlot ? '🏗️ Теплиця — Оберіть культуру' : '🌱 Оберіть культуру'}</h3>
        <div className="crop-selector-grid-3col">
          {CROP_LIST.map((crop) => {
            const locked = crop.unlockLevel > state.level;
            const wrongSeason = !isGreenhousePlot && crop.seasonOnly && crop.seasonOnly !== state.season;
            const canAfford = state.coins >= crop.seedPrice;
            const disabled = locked || wrongSeason || !canAfford;
            const profit = crop.sellPrice - crop.seedPrice;
            const seasonInfo = crop.seasonOnly ? SEASON_INFO[crop.seasonOnly] : null;
            return (
              <button
                key={crop.id}
                className={`crop-row ${disabled ? 'crop-row-disabled' : ''}`}
                disabled={disabled}
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
      </div>
    </div>
  );
}

/* CSS-in-JS not used; styles added to App.css */
