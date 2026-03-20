import { useNavigate } from 'react-router-dom';
import { useGame } from '../state/GameContext';
import { ProfileEditor } from '../components/ProfileEditor';
import { SeasonalBackground } from '../components/SeasonalBackground';
import { WeatherEffects } from '../components/WeatherEffects';
import { ToastContainer } from '../components/Toast';

export function ProfilePage() {
  const { state } = useGame();
  const navigate = useNavigate();

  return (
    <div className={`game-layout-v2 season-${state.season}`}>
      <SeasonalBackground />
      <WeatherEffects />
      <ToastContainer />
      <div className="panel-popup-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
        <div className="panel-popup" role="dialog" aria-modal="true" aria-label="Профіль">
          {state.profile.password && (
            <button className="panel-popup-close" aria-label="Закрити" onClick={() => navigate('/game')}>✕</button>
          )}
          <ProfileEditor onClose={() => navigate('/game')} />
        </div>
      </div>
    </div>
  );
}
