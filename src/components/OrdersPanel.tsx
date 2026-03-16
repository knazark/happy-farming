import { useGame } from '../state/GameContext';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { RECIPES } from '../constants/recipes';
import type { ItemId } from '../types';

function getItemEmoji(itemId: string): string {
  if (itemId in CROPS) return CROPS[itemId as keyof typeof CROPS].emoji;
  if (itemId.endsWith('_product')) {
    const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
    if (animalId in ANIMALS) return ANIMALS[animalId].productEmoji;
  }
  if (itemId in RECIPES) return RECIPES[itemId as keyof typeof RECIPES].emoji;
  return '❓';
}

function getItemName(itemId: string): string {
  if (itemId in CROPS) return CROPS[itemId as keyof typeof CROPS].name;
  if (itemId.endsWith('_product')) {
    const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
    if (animalId in ANIMALS) return ANIMALS[animalId].productName;
  }
  if (itemId in RECIPES) return RECIPES[itemId as keyof typeof RECIPES].name;
  return itemId;
}

export function OrdersPanel() {
  const { state, dispatch } = useGame();

  if (state.orders.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">📋 Замовлення</h2>
        <p className="panel-empty">Немає замовлень</p>
      </div>
    );
  }

  const canFulfill = (orderId: string): boolean => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return false;
    for (const [itemId, needed] of Object.entries(order.items)) {
      if ((state.inventory[itemId as ItemId] ?? 0) < (needed ?? 0)) return false;
    }
    return true;
  };

  return (
    <div className="panel">
      <h2 className="panel-title">📋 Замовлення</h2>
      <div className="order-list">
        {state.orders.map((order) => {
          const timeLeft = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000));
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;

          return (
            <div key={order.id} className="order-item">
              <div className="order-header">
                <span className="order-customer">
                  {order.customerEmoji} {order.customerName}
                </span>
                <span className="order-timer">⏱ {minutes}:{seconds.toString().padStart(2, '0')}</span>
              </div>
              <div className="order-items">
                {Object.entries(order.items).map(([itemId, qty]) => (
                  <span key={itemId} className="order-item-req">
                    {getItemEmoji(itemId)} {getItemName(itemId)} ×{qty}
                    {' '}
                    <span className={(state.inventory[itemId as ItemId] ?? 0) >= (qty ?? 0) ? 'ingredient-ok' : 'ingredient-missing'}>
                      ({state.inventory[itemId as ItemId] ?? 0})
                    </span>
                  </span>
                ))}
              </div>
              <div className="order-footer">
                <span className="order-reward">💰 {order.reward} · ⭐ {order.xpReward} XP</span>
                <button
                  className="btn btn-sell"
                  disabled={!canFulfill(order.id)}
                  onClick={() => dispatch({ type: 'FULFILL_ORDER', orderId: order.id })}
                >
                  Виконати
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
