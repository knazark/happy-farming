import { useGame } from '../state/GameContext';
import { ANIMAL_LIST } from '../constants/animals';
import { MAX_ANIMALS, PEN_UPGRADE_COST, PEN_UPGRADE_AMOUNT, FERTILIZER_PRICE, FEED_PRICE, FEED_DURATION } from '../constants/game';
import { showToast } from './Toast';
import { playAnimalSound } from '../utils/sounds';

export function ShopPanel() {
  const { state, dispatch } = useGame();
  const maxAnimals = state.maxAnimals ?? MAX_ANIMALS;
  const ownedCount = (id: string) => state.animals.filter((a) => a.animalId === id).length;
  const isFull = state.animals.length >= maxAnimals;
  const isFeedActive = Date.now() < state.feedActiveUntil;
  const feedTimeLeft = isFeedActive ? Math.ceil((state.feedActiveUntil - Date.now()) / 1000) : 0;

  return (
    <div className="shop-panel">
      {/* Fertilizer & Feed shop */}
      <div className="shop-fertilizer-section">
          <h3 className="shop-subtitle">🛒 Магазинчик</h3>

          {/* Fertilizer */}
          <div className="shop-fertilizer-row">
            <span className="shop-fertilizer-info">
              <span className="shop-fertilizer-emoji">🧪</span>
              <span>
                <strong>Добриво</strong>
                <span className="shop-fertilizer-owned">У вас: {state.fertilizers ?? 0}</span>
                <span className="shop-fertilizer-desc">Ріст рослин ×2</span>
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

          {/* Animal feed */}
          <div className="shop-fertilizer-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <span className="shop-fertilizer-info">
              <span className="shop-fertilizer-emoji">🌾</span>
              <span>
                <strong>Корм</strong>
                <span className="shop-fertilizer-owned">У вас: {state.animalFeed ?? 0}</span>
                <span className="shop-fertilizer-desc">Продукція тварин ×2 ({FEED_DURATION / 60}хв)</span>
              </span>
            </span>
            <div className="shop-fertilizer-buttons">
              <button
                className="btn btn-buy"
                disabled={state.coins < FEED_PRICE}
                onClick={() => {
                  dispatch({ type: 'BUY_FEED', quantity: 1 });
                  showToast(`🌾 Корм ×1 куплено! −${FEED_PRICE}💰`, 'spend');
                }}
              >
                ×1 ({FEED_PRICE}💰)
              </button>
              <button
                className="btn btn-buy"
                disabled={state.coins < FEED_PRICE * 5}
                onClick={() => {
                  dispatch({ type: 'BUY_FEED', quantity: 5 });
                  showToast(`🌾 Корм ×5 куплено! −${FEED_PRICE * 5}💰`, 'spend');
                }}
              >
                ×5 ({FEED_PRICE * 5}💰)
              </button>
            </div>
          </div>

          {/* Use feed button */}
          {(state.animalFeed > 0 || isFeedActive) && (
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              {isFeedActive ? (
                <span className="feed-active-badge">
                  🌾 Корм активний! {Math.floor(feedTimeLeft / 60)}хв {feedTimeLeft % 60}с
                </span>
              ) : (
                <button
                  className="btn btn-sell"
                  style={{ width: '100%', padding: '8px' }}
                  onClick={() => {
                    dispatch({ type: 'USE_FEED' });
                    showToast('🌾 Корм активовано! Тварини виробляють вдвічі швидше!', 'earn');
                  }}
                >
                  🌾 Активувати корм ({FEED_DURATION / 60}хв)
                </button>
              )}
            </div>
          )}
      </div>

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
