import { useEffect, useState } from 'react';
import { loadFriendGameState } from '../firebase/gameStateSync';
import { getFarmer, type FarmerProfile } from '../firebase/db';
import { PlotCell } from './PlotCell';
import { AnimalCard, groupAnimals } from './AnimalCard';
import type { GameState } from '../types';

interface FriendFarmViewProps {
  friendId: string;
  onBack: () => void;
}

export function FriendFarmView({ friendId, onBack }: FriendFarmViewProps) {
  const [state, setState] = useState<GameState | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [gs, fp] = await Promise.all([
          loadFriendGameState(friendId),
          getFarmer(friendId),
        ]);
        if (!cancelled) {
          setState(gs);
          setProfile(fp);
        }
      } catch (err) {
        console.warn('Failed to load friend farm:', err);
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
      <div>
        <div style={{ fontWeight: 700, fontSize: '16px' }}>{profile.name}</div>
        <div style={{ fontSize: '13px', color: '#666' }}>⭐ Рівень {profile.level}</div>
      </div>
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
          <div style={{ color: '#999', fontSize: '13px' }}>
            Ферма ще не синхронізована для перегляду
          </div>
        </div>
      </div>
    );
  }

  const groups = groupAnimals(state.animals, now, state.feedActiveUntil);

  return (
    <div className="friend-farm">
      {header}

      <div className="farm-view">
        <div className="farm-grid">
          {state.plots.map((plot, i) => (
            <PlotCell
              key={i}
              plot={plot}
              index={i}
              now={now}
              isHovered={false}
              onClick={noop}
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
