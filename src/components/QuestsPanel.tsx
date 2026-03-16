import { useGame } from '../state/GameContext';

export function QuestsPanel() {
  const { state, dispatch } = useGame();

  if (state.dailyQuests.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">📜 Щоденні завдання</h2>
        <p className="panel-empty">Немає завдань</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">📜 Щоденні завдання</h2>
      <div className="quest-list">
        {state.dailyQuests.map((quest) => {
          const done = quest.progress >= quest.target;
          return (
            <div key={quest.id} className={`quest-item ${quest.completed ? 'quest-claimed' : ''}`}>
              <div className="quest-header">
                <span className="quest-emoji">{quest.emoji}</span>
                <span className="quest-desc">{quest.description}</span>
              </div>
              <div className="quest-progress-row">
                <div className="quest-progress-bar">
                  <div
                    className="quest-progress-fill"
                    style={{ width: `${Math.min(1, quest.progress / quest.target) * 100}%` }}
                  />
                </div>
                <span className="quest-progress-text">
                  {quest.progress}/{quest.target}
                </span>
              </div>
              <div className="quest-footer">
                <span className="quest-reward">💰 {quest.reward} · ⭐ {quest.xpReward} XP</span>
                {quest.completed ? (
                  <span className="quest-done-label">✅ Отримано</span>
                ) : done ? (
                  <button
                    className="btn btn-sell"
                    onClick={() => dispatch({ type: 'CLAIM_QUEST', questId: quest.id })}
                  >
                    Забрати!
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
