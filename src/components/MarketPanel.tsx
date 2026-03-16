import { useGame } from '../state/GameContext';
import { FERTILIZER_PRICE, FEED_PRICE, FEED_DURATION } from '../constants/game';
import { ANIMALS } from '../constants/animals';
import { showToast } from './Toast';

export function MarketPanel() {
  const { state, dispatch } = useGame();
  const isFeedActive = Date.now() < state.feedActiveUntil;
  const feedTimeLeft = isFeedActive ? Math.ceil((state.feedActiveUntil - Date.now()) / 1000) : 0;

  // Count growing plots (where fertilizer can be used)
  const growingPlots = state.plots.filter(
    (p) => p.status === 'growing' && !p.fertilized,
  ).length;

  // Count animals and estimate feed value
  const animalCount = state.animals.length;
  const totalProductValue = state.animals.reduce((sum, slot) => {
    const animal = ANIMALS[slot.animalId];
    return sum + animal.productSellPrice;
  }, 0);

  return (
    <div className="panel">
      <h2 className="panel-title">🛒 Магазинчик</h2>

      {/* Fertilizer */}
      <div className="market-item">
        <div className="market-item-header">
          <span className="market-item-emoji">🧪</span>
          <div className="market-item-info">
            <strong>Добриво</strong>
            <span className="market-item-count">Є: {state.fertilizers ?? 0} шт</span>
          </div>
        </div>
        <p className="market-item-how">
          Натисни на рослину що росте — добриво зменшить час вдвічі! Одне добриво = одна ділянка.
        </p>
        <div className="market-item-tip">
          💡 Вигідно для дорогих культур (🌽🥔🍆🍓🫐) — економиш хвилини, заробляєш швидше
        </div>
        {growingPlots > 0 && (
          <div className="market-item-status market-item-status--good">
            🌱 Зараз росте {growingPlots} {growingPlots === 1 ? 'рослина' : growingPlots < 5 ? 'рослини' : 'рослин'} — можна використати!
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

      {/* Animal feed */}
      <div className="market-item">
        <div className="market-item-header">
          <span className="market-item-emoji">🌾</span>
          <div className="market-item-info">
            <strong>Корм для тварин</strong>
            <span className="market-item-count">Є: {state.animalFeed ?? 0} шт</span>
          </div>
        </div>
        <p className="market-item-how">
          Активуй корм — <strong>усі</strong> тварини виробляють продукцію вдвічі швидше протягом {FEED_DURATION / 60} хвилин!
        </p>
        <div className="market-item-tip">
          💡 Чим більше тварин — тим вигідніше.
          {animalCount > 0 && <> У вас {animalCount} {animalCount === 1 ? 'тварина' : animalCount < 5 ? 'тварини' : 'тварин'} (загальний прибуток ~{totalProductValue}💰 за цикл)</>}
        </div>
        {animalCount === 0 && (
          <div className="market-item-status market-item-status--warn">
            🏪 Спочатку купи тварин на Ринку — тоді корм стане в нагоді!
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

        {/* Use feed */}
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
    </div>
  );
}
