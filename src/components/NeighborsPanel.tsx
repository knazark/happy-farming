import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { NEIGHBOR_FARMS, HELP_XP_REWARD, HELP_COIN_REWARD, GIFT_COIN_REWARD } from '../constants/neighbors';

export function NeighborsPanel() {
  const { state, dispatch } = useGame();
  const [visitingId, setVisitingId] = useState<string | null>(null);

  const visiting = visitingId ? state.neighbors.find((n) => n.id === visitingId) : null;
  const farm = visitingId ? NEIGHBOR_FARMS[visitingId] : null;

  return (
    <div className="panel">
      <h2 className="panel-title">🏘️ Сусіди</h2>

      {!visiting ? (
        <div className="neighbor-list">
          {state.neighbors.map((neighbor) => {
            const allDone = neighbor.helpedToday && neighbor.giftCollectedToday;
            return (
              <div key={neighbor.id} className="neighbor-item">
                <span className="neighbor-info">
                  <span className="neighbor-avatar">{neighbor.avatar}</span>
                  <span>{neighbor.name}</span>
                  {allDone && <span className="neighbor-done">✅</span>}
                </span>
                <button
                  className="btn btn-buy"
                  onClick={() => setVisitingId(neighbor.id)}
                >
                  Відвідати
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="neighbor-visit">
          <button className="btn btn-back" onClick={() => setVisitingId(null)}>
            ← Назад
          </button>
          <div className="neighbor-farm-header">
            <span className="neighbor-avatar-lg">{visiting.avatar}</span>
            <div>
              <strong>{visiting.name}</strong>
              <p className="neighbor-farm-desc">{farm?.description}</p>
            </div>
          </div>
          <div className="neighbor-farm-preview">
            <div className="neighbor-farm-row">
              {farm?.crops.map((c, i) => (
                <span key={i} className="neighbor-farm-emoji">{c}</span>
              ))}
              {farm?.animals.map((a, i) => (
                <span key={`a${i}`} className="neighbor-farm-emoji">{a}</span>
              ))}
            </div>
          </div>
          <div className="neighbor-actions">
            <button
              className="btn btn-buy"
              disabled={visiting.helpedToday}
              onClick={() => dispatch({ type: 'HELP_NEIGHBOR', neighborId: visiting.id })}
            >
              {visiting.helpedToday
                ? '✅ Вже допомогли'
                : `🌧️ Полити город (+${HELP_COIN_REWARD}💰, +${HELP_XP_REWARD} XP)`}
            </button>
            <button
              className="btn btn-sell"
              disabled={visiting.giftCollectedToday}
              onClick={() => dispatch({ type: 'COLLECT_GIFT', neighborId: visiting.id })}
            >
              {visiting.giftCollectedToday
                ? '✅ Подарунок зібрано'
                : `🎁 Забрати подарунок (+${GIFT_COIN_REWARD}💰)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
