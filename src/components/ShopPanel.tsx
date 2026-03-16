import { useGame } from '../state/GameContext';
import { ANIMAL_LIST } from '../constants/animals';
import { MAX_ANIMALS, PEN_UPGRADE_COST, PEN_UPGRADE_AMOUNT, FERTILIZER_PRICE } from '../constants/game';
import { showToast } from './Toast';
import { playAnimalSound } from '../utils/sounds';

export function ShopPanel() {
  const { state, dispatch } = useGame();
  const maxAnimals = state.maxAnimals ?? MAX_ANIMALS;
  const ownedCount = (id: string) => state.animals.filter((a) => a.animalId === id).length;
  const isFull = state.animals.length >= maxAnimals;
  const isWinter = state.season === 'winter';

  return (
    <div className="shop-panel">
      {/* Winter fertilizer shop */}
      {isWinter && (
        <div className="shop-fertilizer-section">
          <h3 className="shop-subtitle">❄️ Зимовий магазинчик добрив</h3>
          <p className="shop-fertilizer-hint">
            Зимою ріст сповільнюється вдвічі! Добрива прискорюють ріст на 50%
          </p>
          <div className="shop-fertilizer-row">
            <span className="shop-fertilizer-info">
              <span className="shop-fertilizer-emoji">🧪</span>
              <span>
                <strong>Добриво</strong>
                <span className="shop-fertilizer-owned">У вас: {state.fertilizers ?? 0}</span>
              </span>
            </span>
            <div className="shop-fertilizer-buttons">
              <button
                className="btn btn-buy"
                disabled={state.coins < FERTILIZER_PRICE}
                onClick={() => {
                  dispatch({ type: 'BUY_FERTILIZER', quantity: 1 });
                  showToast(`🧪 Добриво ×1 куплено! −${FERTILIZER_PRICE}💰`, 'spend');
                }}
              >
                ×1 ({FERTILIZER_PRICE}💰)
              </button>
              <button
                className="btn btn-buy"
                disabled={state.coins < FERTILIZER_PRICE * 5}
                onClick={() => {
                  dispatch({ type: 'BUY_FERTILIZER', quantity: 5 });
                  showToast(`🧪 Добриво ×5 куплено! −${FERTILIZER_PRICE * 5}💰`, 'spend');
                }}
              >
                ×5 ({FERTILIZER_PRICE * 5}💰)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shop-header">
        <h2 className="shop-title">🏪 Ринок тварин</h2>
        <span className="shop-capacity">{state.animals.length}/{maxAnimals}</span>
      </div>

      <div className="shop-grid">
        {ANIMAL_LIST.map((animal) => {
          const locked = animal.unlockLevel > state.level;
          const owned = ownedCount(animal.id);
          const canBuy = !locked && state.coins >= animal.buyPrice && !isFull;

          return (
            <button
              key={animal.id}
              className={`shop-item ${locked ? 'shop-item--locked' : ''} ${canBuy ? 'shop-item--available' : ''}`}
              disabled={!canBuy}
              onClick={() => {
                if (!canBuy) return;
                dispatch({ type: 'BUY_ANIMAL', animalId: animal.id });
                playAnimalSound(animal.id);
                showToast(`${animal.emoji} ${animal.name} куплено! −${animal.buyPrice}💰`, 'spend');
              }}
            >
              <div className="shop-item__emoji">{animal.emoji}</div>
              {owned > 0 && <span className="shop-item__owned">×{owned}</span>}
              <span className="shop-item__name">{animal.name}</span>
              {locked ? (
                <span className="shop-item__lock">🔒 Рів.{animal.unlockLevel}</span>
              ) : (
                <>
                  <span className="shop-item__product">
                    {animal.productEmoji} {animal.productSellPrice}💰 · {animal.productionTime >= 60 ? `${Math.floor(animal.productionTime / 60)}хв` : `${animal.productionTime}с`}
                  </span>
                  <span className={`shop-item__price ${state.coins < animal.buyPrice ? 'shop-item__price--cant' : ''}`}>
                    {animal.buyPrice}💰
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {isFull && (
        <p className="shop-full">Загін повний!</p>
      )}

      {/* Upgrade pen capacity */}
      <button
        className="btn btn-buy shop-upgrade-btn"
        disabled={state.coins < PEN_UPGRADE_COST}
        onClick={() => {
          dispatch({ type: 'UPGRADE_PEN' });
          showToast(`🏠 Загін збільшено! +${PEN_UPGRADE_AMOUNT} місць −${PEN_UPGRADE_COST}💰`, 'spend');
        }}
      >
        🏠 Збільшити загін +{PEN_UPGRADE_AMOUNT} ({PEN_UPGRADE_COST}💰)
      </button>

    </div>
  );
}
