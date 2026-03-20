import { useNavigate, useParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useGame } from '../state/GameContext';
import { HUD } from '../components/HUD';
import { SeasonalBackground } from '../components/SeasonalBackground';
import { WeatherEffects } from '../components/WeatherEffects';
import { ToastContainer } from '../components/Toast';
import { FriendFarmView } from '../components/FriendFarmView';
import { useHarvestEffect, HarvestEffectLayer } from '../components/HarvestEffect';

export function FriendFarmPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useGame();
  const navigate = useNavigate();
  const { effects } = useHarvestEffect();

  if (!id) return <Navigate to="/game" replace />;

  return (
    <div className={`game-layout-v2 season-${state.season}`}>
      <SeasonalBackground />
      <WeatherEffects />
      <ToastContainer />
      <HarvestEffectLayer effects={effects} />
      <HUD />
      <div className="game-center">
        <FriendFarmView friendId={id} onBack={() => navigate('/game')} />
      </div>
    </div>
  );
}
