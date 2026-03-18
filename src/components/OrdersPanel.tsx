import { useGame } from '../state/GameContext';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { RECIPES } from '../constants/recipes';
import { showToast } from './Toast';
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

  const streak = state.orderStreak ?? 0;
  const streakBonus = Math.min(streak, 10) * 10;

  const handleFulfill = (orderId: string) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return;

    const isExpired = !!order.expired;
    const bonus = isExpired ? 0 : (1 + streak * 0.1);
    const finalReward = isExpired ? 0 : Math.round(order.reward * bonus);

    dispatch({ type: 'FULFILL_ORDER', orderId });

    if (isExpired) {
      showToast(`💀 Протухле! Без нагороди — серія скинута`, 'spend');
    } else if (streak >= 2) {
      showToast(`🔥 Серія ${streak + 1}! +${finalReward}💰 (+${streakBonus + 10}%)`, 'earn');
    } else {
      showToast(`✅ Замовлення виконано! +${finalReward}💰`, 'earn');
    }
  };

  return (
    <div className="panel">
      <h2 className="panel-title">
        📋 Замовлення
        {streak > 0 && (
          <span style={{ fontSize: '13px', marginLeft: '8px', color: '#FF6B35' }}>
            🔥 {streak} (+{streakBonus}%)
          </span>
        )}
      </h2>
      <ul className="order-list">
        {state.orders.map((order) => {
          const isExpired = !!order.expired;
          const timeLeft = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000));
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;

          return (
            <li
              key={order.id}
              className={`order-item ${isExpired ? 'order-expired' : ''}`}
            >
              <div className="order-header">
                <span className="order-customer">
                  {order.customerEmoji} {order.customerName}
                </span>
                {isExpired ? (
                  <span className="order-timer" style={{ color: '#E53935' }}>💀 Протухло!</span>
                ) : (
                  <span className="order-timer">⏱ {minutes}:{seconds.toString().padStart(2, '0')}</span>
                )}
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
                <span className="order-reward">
                  {isExpired ? (
                    <span style={{ color: '#E53935' }}>💀 <s>{order.reward}💰</s> <s>{order.xpReward} XP</s> — без нагороди</span>
                  ) : streak > 0 ? (
                    <>💰 {Math.round(order.reward * (1 + streak * 0.1))} · ⭐ {order.xpReward} XP · 🔥+{streakBonus}%</>
                  ) : (
                    <>💰 {order.reward} · ⭐ {order.xpReward} XP</>
                  )}
                </span>
                <button
                  className={`btn ${isExpired ? 'btn-buy' : 'btn-sell'}`}
                  disabled={!canFulfill(order.id)}
                  onClick={() => handleFulfill(order.id)}
                >
                  {isExpired ? '💀 Виконати' : 'Виконати'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
