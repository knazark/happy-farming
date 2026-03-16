import { useGame } from '../state/GameContext';
import { ANIMAL_LIST, ANIMALS } from '../constants/animals';
import { MAX_ANIMALS, PEN_UPGRADE_COST, PEN_UPGRADE_AMOUNT } from '../constants/game';
import { showToast } from './Toast';

export function ShopPanel() {
  const { state, dispatch } = useGame();
  const maxAnimals = state.maxAnimals ?? MAX_ANIMALS;
  const ownedCount = (id: string) => state.animals.filter((a) => a.animalId === id).length;
  const isFull = state.animals.length >= maxAnimals;

  return (
    <div className="shop-panel">
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

      {/* Sell animals section */}
      {state.animals.length > 0 && (
        <div className="shop-sell-section">
          <h3 className="shop-sell-title">💰 Продати тварин</h3>
          <div className="shop-sell-list">
            {state.animals.map((slot, idx) => {
              const animal = ANIMALS[slot.animalId];
              const sellPrice = Math.floor(animal.buyPrice * 0.5);
              return (
                <div key={idx} className="shop-sell-item">
                  <span>{animal.emoji} {animal.name}</span>
                  <button
                    className="btn btn-sell"
                    onClick={() => {
                      dispatch({ type: 'SELL_ANIMAL', animalIndex: idx });
                      showToast(`${animal.emoji} ${animal.name} продано! +${sellPrice}💰`, 'earn');
                    }}
                  >
                    Продати {sellPrice}💰
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
