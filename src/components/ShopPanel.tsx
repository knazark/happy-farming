import { useGame } from '../state/GameContext';
import { ANIMAL_LIST } from '../constants/animals';
import { MAX_ANIMALS, PEN_UPGRADE_COST, PEN_UPGRADE_AMOUNT, TRACTOR_PRICE, TRACTOR_REQUIRED_CRAFTS, AUTO_COLLECTOR_PRICE, AUTO_COLLECTOR_REQUIRED_CRAFTS, AUTO_PLANTER_PRICE, AUTO_PLANTER_REQUIRED_CRAFTS, AUTO_PLANTER_MAX_PLOTS } from '../constants/game';
import { RECIPES } from '../constants/recipes';
import { getAnimalPrice } from '../engine/economy';
import { showToast } from './Toast';
import { playAnimalSound } from '../utils/sounds';

export function ShopPanel() {
  const { state, dispatch } = useGame();
  const maxAnimals = state.maxAnimals ?? MAX_ANIMALS;
  const ownedCount = (id: string) => state.animals.filter((a) => a.animalId === id).length;
  const isFull = state.animals.length >= maxAnimals;

  // Tractor requirements
  const hasAllCrafts = TRACTOR_REQUIRED_CRAFTS.every(
    (id) => (state.inventory[id] ?? 0) >= 1
  );
  const canBuyTractor = !state.hasTractor && state.coins >= TRACTOR_PRICE && hasAllCrafts;

  // Auto-collector requirements
  const hasAllCollectorCrafts = AUTO_COLLECTOR_REQUIRED_CRAFTS.every(
    (id) => (state.inventory[id] ?? 0) >= 1
  );
  const canBuyAutoCollector = !state.hasAutoCollector && state.coins >= AUTO_COLLECTOR_PRICE && hasAllCollectorCrafts;

  // Auto-planter requirements
  const hasAllPlanterCrafts = AUTO_PLANTER_REQUIRED_CRAFTS.every(
    (id) => (state.inventory[id] ?? 0) >= 1
  );
  const canBuyAutoPlanter = !state.hasAutoPlanter && state.coins >= AUTO_PLANTER_PRICE && hasAllPlanterCrafts;

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <h2 className="shop-title">🏡 Ринок</h2>
        <span className="shop-capacity">Загін: {state.animals.length}/{maxAnimals}</span>
      </div>

      {/* ─── Тварини ─── */}
      <h3 className="shop-subtitle" style={{ marginTop: '4px', marginBottom: '8px' }}>🐾 Тварини</h3>

      <div className="shop-grid">
        {ANIMAL_LIST.map((animal) => {
          const locked = animal.unlockLevel > state.level;
          const owned = ownedCount(animal.id);
          const price = getAnimalPrice(animal.id, state.animals);
          const canBuy = !locked && state.coins >= price && !isFull;

          return (
            <button
              key={animal.id}
              className={`shop-item ${locked ? 'shop-item--locked' : ''} ${canBuy ? 'shop-item--available' : ''}`}
              disabled={!canBuy}
              onClick={() => {
                if (!canBuy) return;
                dispatch({ type: 'BUY_ANIMAL', animalId: animal.id });
                playAnimalSound(animal.id);
                showToast(`${animal.emoji} ${animal.name} куплено! −${price}💰`, 'spend');
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
                    {(animal.id === 'cat' || animal.id === 'dog') ? (
                      <span style={{ color: '#9C27B0' }}>🐾 Улюбленець · {animal.xpReward} XP</span>
                    ) : (
                      <>{animal.productEmoji} {animal.productSellPrice}💰 · {animal.productionTime >= 60 ? `${Math.floor(animal.productionTime / 60)}хв` : `${animal.productionTime}с`}</>
                    )}
                  </span>
                  <span className={`shop-item__price ${state.coins < price ? 'shop-item__price--cant' : ''}`}>
                    {price}💰
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

      {/* ─── Автопосів ─── */}
      <div className="market-item" style={{ marginTop: '12px' }}>
        <div className="market-item-header">
          <span className="market-item-emoji">🌾</span>
          <div className="market-item-info">
            <strong>Автопосів</strong>
            {state.hasAutoPlanter ? (
              <span className="market-item-count" style={{ color: '#2E7D32' }}>✅ Куплено!</span>
            ) : (
              <span className="market-item-count">{AUTO_PLANTER_PRICE.toLocaleString()}💰</span>
            )}
          </div>
        </div>
        {state.hasAutoPlanter ? (
          <p className="market-item-how" style={{ color: '#2E7D32' }}>
            🌾 Автопосів працює! Натисніть на порожню ділянку, щоб обрати культуру для автопосіву (до {AUTO_PLANTER_MAX_PLOTS} ділянок).
          </p>
        ) : (
          <>
            <p className="market-item-how">
              Автоматично садить обрану культуру після збору — до {AUTO_PLANTER_MAX_PLOTS} ділянок!
            </p>
            <div className="market-item-tip">
              📋 Для покупки потрібно:
            </div>
            <div className="tractor-requirements">
              <div className={`tractor-req ${state.coins >= AUTO_PLANTER_PRICE ? 'tractor-req--done' : ''}`}>
                {state.coins >= AUTO_PLANTER_PRICE ? '✅' : '❌'} {AUTO_PLANTER_PRICE.toLocaleString()}💰
              </div>
              {AUTO_PLANTER_REQUIRED_CRAFTS.map((craftId) => {
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
              disabled={!canBuyAutoPlanter}
              onClick={() => {
                dispatch({ type: 'BUY_AUTO_PLANTER' });
                showToast('🌾 Автопосів куплено! Оберіть культуру на ділянках для автоматичного посіву!', 'earn');
              }}
            >
              🌾 Купити автопосів
            </button>
          </>
        )}
      </div>

      {/* ─── Калеб ─── */}
      <div className="market-item" style={{ marginTop: '12px' }}>
        <div className="market-item-header">
          <span className="market-item-emoji">🐕</span>
          <div className="market-item-info">
            <strong>Калеб</strong>
            {state.hasAutoCollector ? (
              <span className="market-item-count" style={{ color: '#2E7D32' }}>✅ Куплено!</span>
            ) : (
              <span className="market-item-count">{AUTO_COLLECTOR_PRICE.toLocaleString()}💰</span>
            )}
          </div>
        </div>
        {state.hasAutoCollector ? (
          <p className="market-item-how" style={{ color: '#2E7D32' }}>
            🐕 Калеб автоматично збирає продукти від тварин!
          </p>
        ) : (
          <>
            <p className="market-item-how">
              Вірний пес Калеб збирає всі готові продукти від тварин — як трактор для рослин!
            </p>
            <div className="market-item-tip">
              📋 Для покупки потрібно:
            </div>
            <div className="tractor-requirements">
              <div className={`tractor-req ${state.coins >= AUTO_COLLECTOR_PRICE ? 'tractor-req--done' : ''}`}>
                {state.coins >= AUTO_COLLECTOR_PRICE ? '✅' : '❌'} {AUTO_COLLECTOR_PRICE.toLocaleString()}💰
              </div>
              {AUTO_COLLECTOR_REQUIRED_CRAFTS.map((craftId) => {
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
              disabled={!canBuyAutoCollector}
              onClick={() => {
                dispatch({ type: 'BUY_AUTO_COLLECTOR' });
                showToast('🐕 Калеб тепер на фермі! Продукти тварин збираються автоматично!', 'earn');
              }}
            >
              🐕 Завести Калеба
            </button>
          </>
        )}
      </div>

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
