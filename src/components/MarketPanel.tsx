import { useGame } from '../state/GameContext';
import { FERTILIZER_PRICE, FEED_PRICE, FEED_DURATION } from '../constants/game';
import { showToast } from './Toast';

export function MarketPanel() {
  const { state, dispatch } = useGame();
  const isFeedActive = Date.now() < state.feedActiveUntil;
  const feedTimeLeft = isFeedActive ? Math.ceil((state.feedActiveUntil - Date.now()) / 1000) : 0;

  return (
    <div className="panel">
      <h2 className="panel-title">🛒 Магазинчик</h2>

      {/* Fertilizer */}
      <div className="market-item">
        <div className="market-item-header">
          <span className="market-item-emoji">🧪</span>
          <span>
            <strong>Добриво</strong>
            <span className="market-item-desc">Прискорює ріст рослин ×2</span>
          </span>
          <span className="market-item-count">У вас: {state.fertilizers ?? 0}</span>
        </div>
        <div className="market-item-buttons">
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
      <div className="market-item">
        <div className="market-item-header">
          <span className="market-item-emoji">🌾</span>
          <span>
            <strong>Корм</strong>
            <span className="market-item-desc">Продукція тварин ×2 на {FEED_DURATION / 60}хв</span>
          </span>
          <span className="market-item-count">У вас: {state.animalFeed ?? 0}</span>
        </div>
        <div className="market-item-buttons">
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

        {/* Use feed */}
        {(state.animalFeed > 0 || isFeedActive) && (
          <div style={{ marginTop: '8px' }}>
            {isFeedActive ? (
              <span className="feed-active-badge">
                🌾 Корм активний! {Math.floor(feedTimeLeft / 60)}хв {feedTimeLeft % 60}с
              </span>
            ) : (
              <button
                className="btn btn-sell"
                style={{ width: '100%', padding: '10px' }}
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
    </div>
  );
}
