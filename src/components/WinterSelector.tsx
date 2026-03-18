import { useGame } from '../state/GameContext';
import { SOIL_UPGRADE_COSTS, MAX_SOIL_LEVEL } from '../constants/winter';
import { showToast } from './Toast';

interface WinterSelectorProps {
  plotIndex: number;
  onClose: () => void;
}

export function WinterSelector({ plotIndex, onClose }: WinterSelectorProps) {
  const { state, dispatch } = useGame();
  const plot = state.plots[plotIndex];
  const soilLevel = (plot && 'soilLevel' in plot ? plot.soilLevel : undefined) ?? 0;
  const canUpgrade = soilLevel < MAX_SOIL_LEVEL;
  const upgradeCost = canUpgrade ? SOIL_UPGRADE_COSTS[soilLevel] : 0;

  return (
    <>
      <h3 className="crop-selector-title">❄️ Зимові роботи</h3>
      <div className="winter-options">
        <button className="winter-option" onClick={() => {
          dispatch({ type: 'GATHER_WOOD', plotIndex });
          showToast('🪵 Збираємо дрова...', 'info');
          onClose();
        }}>
          <span className="winter-option-emoji">🪵</span>
          <span className="winter-option-name">Збір дров</span>
          <span className="winter-option-desc">~45 сек → дрова для крафту</span>
        </button>
        {canUpgrade ? (
          <button
            className="winter-option"
            disabled={state.coins < upgradeCost}
            onClick={() => {
              dispatch({ type: 'UPGRADE_SOIL', plotIndex });
              showToast(`🔧 Ґрунт покращено до рівня ${soilLevel + 1}! −${upgradeCost}💰`, 'spend');
              onClose();
            }}
          >
            <span className="winter-option-emoji">🔧</span>
            <span className="winter-option-name">Покращити ґрунт (рівень {soilLevel + 1})</span>
            <span className="winter-option-desc">{upgradeCost}💰 → −{(soilLevel + 1) * 10}% часу росту</span>
          </button>
        ) : (
          <div className="winter-option winter-option--maxed">
            <span className="winter-option-emoji">✅</span>
            <span className="winter-option-name">Ґрунт макс. рівня</span>
          </div>
        )}
      </div>
      {soilLevel > 0 && (
        <div className="winter-soil-info">
          ⚡ Ґрунт рів.{soilLevel}/{MAX_SOIL_LEVEL}: −{soilLevel * 10}% часу росту
          {plot && 'soilHarvestsLeft' in plot && plot.soilHarvestsLeft != null && (
            <span> · ще {plot.soilHarvestsLeft} збирань</span>
          )}
        </div>
      )}
    </>
  );
}
