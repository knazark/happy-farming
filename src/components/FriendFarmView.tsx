import { useEffect, useState, useCallback } from 'react';
import { loadFriendGameState, harvestFriendPlot } from '../firebase/gameStateSync';
import { getFarmer, getFarmerId, getInteraction, recordHelp, type FarmerProfile } from '../firebase/db';
import { useGame } from '../state/GameContext';
import { PlotCell } from './PlotCell';
import { AnimalCard, groupAnimals } from './AnimalCard';
import { showToast } from './Toast';
import { CROPS } from '../constants/crops';
import type { GameState } from '../types';

const HARVEST_REWARD_PERCENT = 0.15; // 15% of crop sellPrice

interface FriendFarmViewProps {
  friendId: string;
  onBack: () => void;
}

export function FriendFarmView({ friendId, onBack }: FriendFarmViewProps) {
  const { state: myState, dispatch } = useGame();
  const [state, setState] = useState<GameState | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [helpedToday, setHelpedToday] = useState(false);
  const [helpRecorded, setHelpRecorded] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [friendOnline, setFriendOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const myId = getFarmerId();
        const [gs, fp, interaction] = await Promise.all([
          loadFriendGameState(friendId),
          getFarmer(friendId),
          getInteraction(myId, friendId),
        ]);
        if (!cancelled) {
          setState(gs);
          setProfile(fp);
          setHelpedToday(interaction.helpedToday);
          setHelpRecorded(interaction.helpedToday);
          // Check if friend is online (lastSeen < 5 min ago)
          if (fp?.lastSeen) {
            const lastSeenMs = (fp.lastSeen as { toMillis?: () => number })?.toMillis?.()
              ?? (fp.lastSeen as { seconds?: number })?.seconds ? (fp.lastSeen as { seconds: number }).seconds * 1000
              : 0;
            setFriendOnline(Date.now() - lastSeenMs < 5 * 60 * 1000);
          }
        }
      } catch (err) {
        console.warn('Failed to load friend farm:', err);
        if (!cancelled) {
          showToast('Не вдалось завантажити ферму друга', 'info');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [friendId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const handlePlotClick = useCallback(async (plotIndex: number) => {
    if (!state || harvesting || helpedToday) return;
    const plot = state.plots[plotIndex];
    if (!plot || plot.status !== 'ready') return;

    const crop = CROPS[plot.cropId];
    setHarvesting(true);

    try {
      const myName = myState?.profile?.name || 'Фермер';

      // Step 1: harvest friend's plot in Firestore
      let updated: GameState | null = null;
      try {
        updated = await harvestFriendPlot(friendId, plotIndex, myName);
      } catch (e) {
        console.error('harvestFriendPlot failed:', e);
        showToast('Не вдалось зібрати врожай', 'info');
        return;
      }

      if (!updated) {
        showToast('Ділянка вже зібрана', 'info');
        return;
      }

      // Update local view of friend's farm
      setState(updated);

      // Step 2: record daily help once per day (non-critical)
      if (!helpRecorded) {
        try {
          const myId = getFarmerId();
          await recordHelp(myId, friendId);
          setHelpRecorded(true);
        } catch (e) {
          console.warn('recordHelp failed (non-critical):', e);
        }
      }

      // Step 3: reward myself
      const rewardCoins = Math.max(1, Math.floor(crop.sellPrice * HARVEST_REWARD_PERCENT));
      const rewardXp = Math.max(1, Math.floor(crop.xpReward * 0.5));
      dispatch({ type: 'FRIEND_HARVEST_REWARD', coins: rewardCoins, xp: rewardXp });

      showToast(
        `${crop.emoji} Зібрано для ${profile?.name ?? 'друга'}! +${rewardCoins}💰 +${rewardXp}⭐`,
        'earn',
      );

      // Check if all ready plots are now harvested
      const remainingReady = updated.plots.filter(p => p.status === 'ready').length;
      if (remainingReady === 0) {
        setHelpedToday(true);
      }
    } catch (err) {
      console.error('Friend harvest error:', err);
      showToast('Помилка з\'єднання', 'info');
    } finally {
      setHarvesting(false);
    }
  }, [state, harvesting, helpedToday, helpRecorded, friendId, myState.profile.name, profile?.name, dispatch]);

  if (loading) {
    return (
      <div className="friend-farm" style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: '24px' }}>🌾 Завантаження ферми...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="friend-farm" style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: '18px', marginBottom: '16px' }}>Не вдалося знайти фермера</div>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #999', borderRadius: '8px',
          padding: '8px 16px', fontSize: '16px', cursor: 'pointer',
        }}>← Назад</button>
      </div>
    );
  }

  const noop = () => {};

  // Count ready plots
  const readyCount = state ? state.plots.filter(p => p.status === 'ready').length : 0;

  const header = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', background: 'rgba(255,255,255,0.9)',
      borderRadius: '12px', marginBottom: '12px', backdropFilter: 'blur(8px)',
    }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
      }}>← Назад</button>
      <span style={{ fontSize: '28px' }}>{profile.avatar}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '16px' }}>{profile.name}</div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          {profile.level}⭐
          {friendOnline && <span style={{ marginLeft: '6px', color: '#4CAF50' }}>🟢 онлайн</span>}
        </div>
      </div>
      {state && !helpedToday && readyCount > 0 && (
        <div style={{
          background: '#4CAF50', color: '#fff', padding: '4px 10px',
          borderRadius: '10px', fontSize: '12px', fontWeight: 700,
        }}>
          🌾 {readyCount} готово
        </div>
      )}
      {helpedToday && (
        <div style={{
          background: '#F5F5F5', color: '#999', padding: '4px 10px',
          borderRadius: '10px', fontSize: '12px',
        }}>
          ✅ Допомога надана
        </div>
      )}
    </div>
  );

  // Profile exists but no gameState saved yet
  if (!state) {
    return (
      <div className="friend-farm">
        {header}
        <div style={{
          textAlign: 'center', padding: '32px 16px',
          background: 'rgba(255,255,255,0.8)', borderRadius: '12px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{profile.avatar}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{profile.name}</div>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            🏆 Рахунок: {profile.score} · 🐾 Тварин: {profile.animalCount} · 🌱 Ділянок: {profile.unlockedPlots}
          </div>
          <div style={{ color: '#999', fontSize: '13px', marginBottom: '12px' }}>
            Ферма ще зберігається — спробуйте пізніше
          </div>
          <button onClick={() => window.location.reload()} style={{
            background: '#7C4DFF', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '8px 20px', fontSize: '14px', cursor: 'pointer',
          }}>🔄 Оновити</button>
        </div>
      </div>
    );
  }

  const groups = groupAnimals(state.animals, now, state.feedActiveUntil);
  const canHarvest = !helpedToday && !harvesting && !friendOnline;

  return (
    <div className={`friend-farm ${canHarvest ? 'friend-farm-harvest' : ''}`}>
      {header}

      {friendOnline && (
        <div style={{
          textAlign: 'center', padding: '8px', marginBottom: '8px',
          background: 'rgba(33, 150, 243, 0.15)', borderRadius: '10px',
          fontSize: '13px', color: '#1565C0',
        }}>
          🟢 {profile.name} зараз онлайн — збирати можна коли друг офлайн
        </div>
      )}
      {!friendOnline && !helpedToday && readyCount > 0 && (
        <div style={{
          textAlign: 'center', padding: '8px', marginBottom: '8px',
          background: 'rgba(76, 175, 80, 0.15)', borderRadius: '10px',
          fontSize: '13px', color: '#2E7D32',
        }}>
          Натисніть на готову ділянку, щоб зібрати врожай для друга! 🌾
        </div>
      )}

      <div className="farm-view">
        <div className="farm-grid">
          {state.plots.map((plot, i) => (
            <PlotCell
              key={i}
              plot={plot}
              index={i}
              now={now}
              isHovered={false}
              onClick={canHarvest && plot.status === 'ready' ? () => handlePlotClick(i) : noop}
              onMouseEnter={noop}
              onMouseLeave={noop}
            />
          ))}
        </div>
        <div className="animal-pen">
          <div className="animal-pen-label">🐾 Тварини</div>
          {state.animals.length === 0 ? (
            <div className="animal-pen-empty">У фермера немає тварин</div>
          ) : (
            <div className="animal-grid">
              {groups.map((group) => (
                <AnimalCard
                  key={group.animalId}
                  group={group}
                  now={now}
                  feedActiveUntil={state.feedActiveUntil}
                  onClick={noop}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
