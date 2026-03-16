import { useGame } from '../state/GameContext';
import { ACHIEVEMENT_LIST } from '../constants/achievements';

export function AchievementsPanel() {
  const { state } = useGame();

  return (
    <div className="panel">
      <h2 className="panel-title">
        🏆 Досягнення ({state.achievements.length}/{ACHIEVEMENT_LIST.length})
      </h2>
      <div className="achievement-list">
        {ACHIEVEMENT_LIST.map((ach) => {
          const unlocked = state.achievements.includes(ach.id);
          return (
            <div key={ach.id} className={`achievement-item ${unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}>
              <span className="achievement-emoji">{unlocked ? ach.emoji : '🔒'}</span>
              <div className="achievement-info">
                <strong>{ach.name}</strong>
                <span className="achievement-desc">{ach.description}</span>
              </div>
              {unlocked && <span className="achievement-reward">+{ach.reward}💰</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
