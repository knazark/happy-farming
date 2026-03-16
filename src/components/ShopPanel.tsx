import { useGame } from '../state/GameContext';
import { ANIMAL_LIST, ANIMALS } from '../constants/animals';
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

  const growingPlots = state.plots.filter(
    (p) => p.status === 'growing' && !p.fertilized,
  ).length;
  const animalCount = state.animals.length;
  const totalProductValue = state.animals.reduce((sum, slot) => {
    const animal = ANIMALS[slot.animalId];
    return sum + animal.productSellPrice;
  }, 0);

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <h2 className="shop-title">🏪 Ринок</h2>
        <span className="shop-capacity">Загін: {state.animals.length}/{maxAnimals}</span>
      </div>

      {/* ─── Магазинчик (добриво + корм) ─── */}
      <div className="market-item">
        <div className="market-item-header">
          <span className="market-item-emoji">🧪</span>
          <div className="market-item-info">
            <strong>Добриво</strong>
            <span className="market-item-count">Є: {state.fertilizers ?? 0} шт</span>
          </div>
        </div>
        <p className="market-item-how">
          Натисни на рослину що росте — час зменшиться вдвічі! Одне добриво = одна ділянка.
        </p>
        <div className="market-item-tip">
          💡 Вигідно для дорогих культур (🌽🥔🍆🍓🫐)
        </div>
        {growingPlots > 0 && (
          <div className="market-item-status market-item-status--good">
            🌱 Росте {growingPlots} {growingPlots === 1 ? 'рослина' : growingPlots < 5 ? 'рослини' : 'рослин'} — можна використати!
          </div>
        )}
        <div className="market-item-buttons">
          <button
            className="btn btn-buy"
            disabled={state.coins < FERTILIZER_PRICE}
            onClick={() => {
              dispatch({ type: 'BUY_FERTILIZER', quantity: 1 });
              showToast(`🧪 Добриво ×1 куплено! −${FERTILIZER_PRICE}💰`, 'spend');
            }}
          >
            ×1 за {FERTILIZER_PRICE}💰
          </button>
          <button
            className="btn btn-buy"
            disabled={state.coins < FERTILIZER_PRICE * 5}
            onClick={() => {
              dispatch({ type: 'BUY_FERTILIZER', quantity: 5 });
              showToast(`🧪 Добриво ×5 куплено! −${FERTILIZER_PRICE * 5}💰`, 'spend');
            }}
          >
            ×5 за {FERTILIZER_PRICE * 5}💰
          </button>
        </div>
      </div>

      <div className="market-item">
        <div className="market-item-header">
          <span className="market-item-emoji">🌾</span>
          <div className="market-item-info">
            <strong>Корм для тварин</strong>
            <span className="market-item-count">Є: {state.animalFeed ?? 0} шт</span>
          </div>
        </div>
        <p className="market-item-how">
          Активуй — <strong>усі</strong> тварини виробляють ×2 швидше на {FEED_DURATION / 60} хв!
        </p>
        <div className="market-item-tip">
          💡 Чим більше тварин — тим вигідніше.
          {animalCount > 0 && <> У вас {animalCount} ({'\u2248'}{totalProductValue}💰/цикл)</>}
        </div>
        {animalCount === 0 && (
          <div className="market-item-status market-item-status--warn">
            🏪 Спочатку купи тварин — тоді корм стане в нагоді!
          </div>
        )}
        <div className="market-item-buttons">
          <button
            className="btn btn-buy"
            disabled={state.coins < FEED_PRICE}
            onClick={() => {
              dispatch({ type: 'BUY_FEED', quantity: 1 });
              showToast(`🌾 Корм ×1 куплено! −${FEED_PRICE}💰`, 'spend');
            }}
          >
            ×1 за {FEED_PRICE}💰
          </button>
          <button
            className="btn btn-buy"
            disabled={state.coins < FEED_PRICE * 5}
            onClick={() => {
              dispatch({ type: 'BUY_FEED', quantity: 5 });
              showToast(`🌾 Корм ×5 куплено! −${FEED_PRICE * 5}💰`, 'spend');
            }}
          >
            ×5 за {FEED_PRICE * 5}💰
          </button>
        </div>
        {(state.animalFeed > 0 || isFeedActive) && (
          <div style={{ marginTop: '10px' }}>
            {isFeedActive ? (
              <span className="feed-active-badge">
                🌾 Корм активний! ⏱ {Math.floor(feedTimeLeft / 60)}хв {feedTimeLeft % 60}с
              </span>
            ) : (
              <button
                className="btn btn-sell market-activate-btn"
                onClick={() => {
                  dispatch({ type: 'USE_FEED' });
                  showToast('🌾 Корм активовано! Тварини виробляють вдвічі швидше!', 'earn');
                }}
              >
                ▶ Активувати корм ({FEED_DURATION / 60} хв прискорення)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Тварини ─── */}
      <h3 className="shop-subtitle" style={{ marginTop: '4px', marginBottom: '8px' }}>🐾 Тварини</h3>

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
