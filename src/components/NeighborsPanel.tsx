import { useState, useEffect } from 'react';
import { useGame } from '../state/GameContext';
import { showToast } from './Toast';
import {
  DEFAULT_NEIGHBORS,
  NEIGHBOR_FARMS,
  HELP_XP_REWARD,
  HELP_COIN_REWARD,
  GIFT_COIN_REWARD,
} from '../constants/neighbors';
import {
  getFarmerId,
  getFarmer,
  getNeighborProfiles,
  getLeaderboard,
  recordHelp,
  recordGiftCollect,
  getInteraction,
  type FarmerProfile,
} from '../firebase/db';

type Tab = 'neighbors' | 'leaderboard' | 'invite';

export function NeighborsPanel() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<Tab>('neighbors');
  const [realNeighbors, setRealNeighbors] = useState<FarmerProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<Record<string, { helpedToday: boolean; giftCollectedToday: boolean }>>({});
  const [visitingId, setVisitingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const myId = getFarmerId();

  // Fetch real neighbors on mount
  useEffect(() => {
    setLoading(true);
    getFarmer(myId)
      .then((me) => {
        if (me && me.neighborIds && me.neighborIds.length > 0) {
          return getNeighborProfiles(me.neighborIds);
        }
        return [];
      })
      .then((profiles) => {
        setRealNeighbors(profiles);
        // Fetch interactions for each neighbor
        return Promise.all(
          profiles.map((p) =>
            getInteraction(myId, p.id).then((inter) => ({ id: p.id, ...inter }))
          )
        );
      })
      .then((inters) => {
        const map: Record<string, { helpedToday: boolean; giftCollectedToday: boolean }> = {};
        for (const i of inters) {
          map[i.id] = { helpedToday: i.helpedToday, giftCollectedToday: i.giftCollectedToday };
        }
        setInteractions(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [myId]);

  // Fetch leaderboard when tab switches
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLoading(true);
      getLeaderboard()
        .then(setLeaderboard)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const hasRealNeighbors = realNeighbors.length > 0;

  // NPC fallback for visiting
  const visiting = visitingId ? state.neighbors.find((n) => n.id === visitingId) : null;
  const farm = visitingId ? NEIGHBOR_FARMS[visitingId] : null;

  const handleHelp = async (neighborId: string, isReal: boolean) => {
    if (isReal) {
      await recordHelp(myId, neighborId).catch(() => {});
      setInteractions((prev) => ({
        ...prev,
        [neighborId]: { ...prev[neighborId], helpedToday: true },
      }));
    }
    dispatch({ type: 'HELP_NEIGHBOR', neighborId: isReal ? DEFAULT_NEIGHBORS[0].id : neighborId });
    showToast(`🌧️ Допомога сусіду! +${HELP_COIN_REWARD}💰 +${HELP_XP_REWARD}XP`, 'earn');
  };

  const handleGift = async (neighborId: string, isReal: boolean) => {
    if (isReal) {
      await recordGiftCollect(myId, neighborId).catch(() => {});
      setInteractions((prev) => ({
        ...prev,
        [neighborId]: { ...prev[neighborId], giftCollectedToday: true },
      }));
    }
    dispatch({ type: 'COLLECT_GIFT', neighborId: isReal ? DEFAULT_NEIGHBORS[0].id : neighborId });
    showToast(`🎁 Подарунок! +${GIFT_COIN_REWARD}💰`, 'earn');
  };

  const inviteUrl = `${window.location.origin}?invite=${myId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      showToast('📋 Посилання скопійовано!', 'info');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="panel">
      <h2 className="panel-title">🏘️ Сусіди</h2>

      {/* Tabs */}
      <div className="neighbor-tabs">
        <button
          className={`neighbor-tab ${activeTab === 'neighbors' ? 'neighbor-tab-active' : ''}`}
          onClick={() => { setActiveTab('neighbors'); setVisitingId(null); }}
        >
          👥 Сусіди
        </button>
        <button
          className={`neighbor-tab ${activeTab === 'leaderboard' ? 'neighbor-tab-active' : ''}`}
          onClick={() => { setActiveTab('leaderboard'); setVisitingId(null); }}
        >
          🏆 Рейтинг
        </button>
        <button
          className={`neighbor-tab ${activeTab === 'invite' ? 'neighbor-tab-active' : ''}`}
          onClick={() => { setActiveTab('invite'); setVisitingId(null); }}
        >
          📨 Запросити
        </button>
      </div>

      {/* Tab: Neighbors */}
      {activeTab === 'neighbors' && !visiting && (
        <div className="neighbor-list">
          {loading && <p style={{ textAlign: 'center', color: '#999' }}>Завантаження...</p>}

          {/* Real neighbors from Firebase */}
          {hasRealNeighbors && realNeighbors.map((n) => {
            const inter = interactions[n.id] || { helpedToday: false, giftCollectedToday: false };
            const allDone = inter.helpedToday && inter.giftCollectedToday;
            return (
              <div key={n.id} className="neighbor-item">
                <span className="neighbor-info">
                  <span className="neighbor-avatar">{n.avatar}</span>
                  <span>
                    {n.name}
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '6px' }}>
                      ⭐{n.level} 🏆{n.score}
                    </span>
                  </span>
                  {allDone && <span className="neighbor-done">✅</span>}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-buy"
                    disabled={inter.helpedToday}
                    onClick={() => handleHelp(n.id, true)}
                  >
                    {inter.helpedToday ? '✅' : `🌧️ +${HELP_COIN_REWARD}💰`}
                  </button>
                  <button
                    className="btn btn-sell"
                    disabled={inter.giftCollectedToday}
                    onClick={() => handleGift(n.id, true)}
                  >
                    {inter.giftCollectedToday ? '✅' : `🎁 +${GIFT_COIN_REWARD}💰`}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Separator if both real and NPC */}
          {hasRealNeighbors && (
            <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', margin: '8px 0' }}>
              — NPC сусіди —
            </p>
          )}

          {/* NPC fallback neighbors */}
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
      )}

      {/* NPC Visit view (kept for NPC neighbors) */}
      {activeTab === 'neighbors' && visiting && (
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

      {/* Tab: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div>
          {loading && <p style={{ textAlign: 'center', color: '#999' }}>Завантаження...</p>}
          {!loading && leaderboard.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999' }}>Поки що нікого немає</p>
          )}
          <table className="leaderboard-table">
            <tbody>
              {leaderboard.map((farmer, i) => (
                <tr
                  key={farmer.id}
                  className={`leaderboard-row ${farmer.id === myId ? 'leaderboard-me' : ''}`}
                >
                  <td style={{ width: '30px', textAlign: 'center', fontWeight: 700 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </td>
                  <td style={{ width: '30px', textAlign: 'center' }}>{farmer.avatar}</td>
                  <td>
                    {farmer.name}
                    {farmer.id === myId && <span style={{ color: '#7C4DFF', marginLeft: '4px' }}>(ви)</span>}
                  </td>
                  <td style={{ textAlign: 'right', color: '#666' }}>⭐{farmer.level}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#F59E0B' }}>🏆{farmer.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Invite */}
      {activeTab === 'invite' && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px' }}>
            Надішліть це посилання друзям, щоб стати сусідами! 🏡
          </p>
          <div className="invite-url">{inviteUrl}</div>
          <button
            className="btn btn-buy"
            onClick={handleCopy}
            style={{ width: '100%', padding: '12px', fontSize: '16px', marginTop: '8px' }}
          >
            {copied ? '✅ Скопійовано!' : '📋 Копіювати посилання'}
          </button>
          <p style={{ marginTop: '16px', color: '#999', fontSize: '13px' }}>
            👥 Реальних сусідів: {realNeighbors.length}
          </p>
        </div>
      )}
    </div>
  );
}
