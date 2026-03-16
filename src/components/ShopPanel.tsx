import { useGame } from '../state/GameContext';
import { ANIMAL_LIST } from '../constants/animals';
import { MAX_ANIMALS, PEN_UPGRADE_COST, PEN_UPGRADE_AMOUNT, FEED_PRICE, FEED_DURATION, TRACTOR_PRICE, TRACTOR_REQUIRED_CRAFTS } from '../constants/game';
import { RECIPES } from '../constants/recipes';
import { showToast } from './Toast';
import { playAnimalSound } from '../utils/sounds';

export function ShopPanel() {
  const { state, dispatch } = useGame();
  const maxAnimals = state.maxAnimals ?? MAX_ANIMALS;
  const ownedCount = (id: string) => state.animals.filter((a) => a.animalId === id).length;
  const isFull = state.animals.length >= maxAnimals;
  const isFeedActive = Date.now() < state.feedActiveUntil;
  const feedTimeLeft = isFeedActive ? Math.ceil((state.feedActiveUntil - Date.now()) / 1000) : 0;

  const animalCount = state.animals.length;

  // Feed costs scale with animal count: need 1 feed per animal (min 1)
  const feedCostPerUse = Math.max(1, animalCount);
  const canActivateFeed = (state.animalFeed ?? 0) >= feedCostPerUse;

  // Tractor requirements
  const hasAllCrafts = TRACTOR_REQUIRED_CRAFTS.every(
    (id) => (state.inventory[id] ?? 0) >= 1
  );
  const canBuyTractor = !state.hasTractor && state.coins >= TRACTOR_PRICE && hasAllCrafts;

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <h2 className="shop-title">🏪 Ринок</h2>
        <span className="shop-capacity">Загін: {state.animals.length}/{maxAnimals}</span>
      </div>

      {/* ─── Корм для тварин ─── */}
      {animalCount > 0 && (
        <div className="market-item">
          <div className="market-item-header">
            <span className="market-item-emoji">🌾</span>
            <div className="market-item-info">
              <strong>Корм для тварин</strong>
              <span className="market-item-count">Є: {state.animalFeed ?? 0} шт</span>
            </div>
          </div>
          <p className="market-item-how">
            Активуй — усі тварини виробляють ×2 швидше на {FEED_DURATION / 60} хв.
            Потрібно <strong>{feedCostPerUse} корму</strong> (1 на кожну тварину).
          </p>
          <div className="market-item-tip">
            💡 {animalCount} {animalCount === 1 ? 'тварина' : animalCount < 5 ? 'тварини' : 'тварин'} → потрібно {feedCostPerUse} корму ({feedCostPerUse * FEED_PRICE}💰)
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
              ×1 за {FEED_PRICE}💰
            </button>
            <button
              className="btn btn-buy"
              disabled={state.coins < FEED_PRICE * feedCostPerUse}
              onClick={() => {
                dispatch({ type: 'BUY_FEED', quantity: feedCostPerUse });
                showToast(`🌾 Корм ×${feedCostPerUse} куплено! −${FEED_PRICE * feedCostPerUse}💰`, 'spend');
              }}
            >
              ×{feedCostPerUse} за {FEED_PRICE * feedCostPerUse}💰
            </button>
          </div>
          {(canActivateFeed || isFeedActive) && (
            <div style={{ marginTop: '10px' }}>
              {isFeedActive ? (
                <span className="feed-active-badge">
                  🌾 Корм активний! ⏱ {Math.floor(feedTimeLeft / 60)}хв {feedTimeLeft % 60}с
                </span>
              ) : (
                <button
                  className="btn btn-sell market-activate-btn"
                  disabled={!canActivateFeed}
                  onClick={() => {
                    dispatch({ type: 'USE_FEED' });
                    showToast(`🌾 Корм активовано! −${feedCostPerUse} корму. Тварини ×2 швидше!`, 'earn');
                  }}
                >
                  ▶ Годувати ({feedCostPerUse} корму → {FEED_DURATION / 60} хв прискорення)
                </button>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* ─── Трактор ─── */}
      <div className="market-item" style={{ marginTop: '12px' }}>
        <div className="market-item-header">
          <span className="market-item-emoji">🚜</span>
          <div className="market-item-info">
            <strong>Трактор</strong>
            {state.hasTractor ? (
              <span className="market-item-count" style={{ color: '#2E7D32' }}>✅ Куплено!</span>
            ) : (
              <span className="market-item-count">{TRACTOR_PRICE.toLocaleString()}💰</span>
            )}
          </div>
        </div>
        {state.hasTractor ? (
          <p className="market-item-how" style={{ color: '#2E7D32' }}>
            🚜 Трактор автоматично збирає готові рослини!
          </p>
        ) : (
          <>
            <p className="market-item-how">
              Автоматично збирає всі готові рослини — не треба натискати вручну!
            </p>
            <div className="market-item-tip">
              📋 Для покупки потрібно:
            </div>
            <div className="tractor-requirements">
              <div className={`tractor-req ${state.coins >= TRACTOR_PRICE ? 'tractor-req--done' : ''}`}>
                {state.coins >= TRACTOR_PRICE ? '✅' : '❌'} {TRACTOR_PRICE.toLocaleString()}💰
              </div>
              {TRACTOR_REQUIRED_CRAFTS.map((craftId) => {
                const recipe = RECIPES[craftId];
                const has = (state.inventory[craftId] ?? 0) >= 1;
                return (
                  <div key={craftId} className={`tractor-req ${has ? 'tractor-req--done' : ''}`}>
                    {has ? '✅' : '❌'} {recipe.emoji} {recipe.name}
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-buy market-activate-btn"
              style={{ marginTop: '8px' }}
              disabled={!canBuyTractor}
              onClick={() => {
                dispatch({ type: 'BUY_TRACTOR' });
                showToast('🚜 Трактор куплено! Тепер рослини збираються автоматично!', 'earn');
              }}
            >
              🚜 Купити трактор
            </button>
          </>
        )}
      </div>
    </div>
  );
}
