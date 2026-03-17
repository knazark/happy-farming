import { useGame } from '../state/GameContext';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { RECIPES } from '../constants/recipes';
import { STORAGE_UPGRADE_COST, STORAGE_UPGRADE_AMOUNT } from '../constants/recipes';
import { WOOD_SELL_PRICE } from '../constants/winter';
import { showToast } from './Toast';
import type { ItemId } from '../types';

function getItemInfo(itemId: ItemId): { emoji: string; name: string; sellPrice: number } {
  if (itemId === 'firewood') {
    return { emoji: '🪵', name: 'Дрова', sellPrice: WOOD_SELL_PRICE };
  }
  if (itemId.endsWith('_product')) {
    const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
    const animal = ANIMALS[animalId];
    return { emoji: animal.productEmoji, name: animal.productName, sellPrice: animal.productSellPrice };
  }
  if (itemId in RECIPES) {
    const recipe = RECIPES[itemId as keyof typeof RECIPES];
    return { emoji: recipe.emoji, name: recipe.name, sellPrice: recipe.sellPrice };
  }
  const crop = CROPS[itemId as keyof typeof CROPS];
  return { emoji: crop.emoji, name: crop.name, sellPrice: crop.sellPrice };
}

export function Inventory({ onClose }: { onClose?: () => void }) {
  const { state, dispatch } = useGame();
  const items = Object.entries(state.inventory).filter(([, qty]) => qty && qty > 0);
  const totalItems = items.reduce((sum, [, qty]) => sum + (qty ?? 0), 0);

  const marketLabel =
    state.marketPriceMultiplier > 1
      ? `📈 ×${state.marketPriceMultiplier}`
      : state.marketPriceMultiplier < 1
        ? `📉 ×${state.marketPriceMultiplier}`
        : '';

  const sellAllTotal = items.reduce((sum, [id, qty]) => {
    const info = getItemInfo(id as ItemId);
    return sum + Math.round(info.sellPrice * (qty ?? 0) * state.marketPriceMultiplier);
  }, 0);

  const handleSellAll = () => {
    for (const [id, qty] of items) {
      if (qty && qty > 0) {
        dispatch({ type: 'SELL_ITEM', itemId: id as ItemId, quantity: qty });
      }
    }
    showToast(`💰 Все продано! +${sellAllTotal}💰`, 'earn');
    onClose?.();
  };

  return (
    <div className="panel">
      <h2 className="panel-title">
        📦 Інвентар ({totalItems}/{state.storageCapacity})
        {marketLabel && <span className="market-label"> {marketLabel}</span>}
      </h2>
      {items.length === 0 ? (
        <p className="panel-empty">Порожньо</p>
      ) : (
        <div className="inventory-list">
          {items.length > 1 && (
            <button className="btn btn-sell-all" onClick={handleSellAll}>
              Продати все · {sellAllTotal}💰
            </button>
          )}
          {items.map(([id, qty]) => {
            const info = getItemInfo(id as ItemId);
            const unitPrice = Math.round(info.sellPrice * state.marketPriceMultiplier);
            const totalPrice = Math.round(info.sellPrice * qty! * state.marketPriceMultiplier);
            return (
              <div key={id} className="inventory-item">
                <span className="inventory-item-info">
                  {info.emoji} {info.name} × {qty}
                </span>
                <div className="inventory-buttons">
                  <button
                    className="btn btn-sell"
                    onClick={() =>
                      dispatch({ type: 'SELL_ITEM', itemId: id as ItemId, quantity: 1 })
                    }
                  >
                    1 ({unitPrice}💰)
                  </button>
                  {qty! > 1 && (
                    <button
                      className="btn btn-sell"
                      onClick={() =>
                        dispatch({ type: 'SELL_ITEM', itemId: id as ItemId, quantity: qty! })
                      }
                    >
                      Все ({totalPrice}💰)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn btn-buy shop-upgrade-btn"
        disabled={state.coins < STORAGE_UPGRADE_COST}
        onClick={() => {
          dispatch({ type: 'UPGRADE_STORAGE' });
          showToast(`📦 Інвентар збільшено! +${STORAGE_UPGRADE_AMOUNT} місць −${STORAGE_UPGRADE_COST}💰`, 'spend');
        }}
      >
        📦 Збільшити +{STORAGE_UPGRADE_AMOUNT} ({STORAGE_UPGRADE_COST}💰)
      </button>
    </div>
  );
}
