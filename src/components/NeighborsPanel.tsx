import { useState, useEffect } from 'react';
import { useGame } from '../state/GameContext';
import { showToast } from './Toast';
import {
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
  const { dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<Tab>('neighbors');
  const [friends, setFriends] = useState<FarmerProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<Record<string, { helpedToday: boolean; giftCollectedToday: boolean }>>({});
  const [copied, setCopied] = useState(false);

  const myId = getFarmerId();

  // Fetch friends on mount
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
        setFriends(profiles);
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

  const handleHelp = async (neighborId: string) => {
    await recordHelp(myId, neighborId).catch(() => {});
    setInteractions((prev) => ({
      ...prev,
      [neighborId]: { ...prev[neighborId], helpedToday: true },
    }));
    dispatch({ type: 'HELP_NEIGHBOR', neighborId });
    showToast(`🌧️ Допомога другу! +${HELP_COIN_REWARD}💰 +${HELP_XP_REWARD}XP`, 'earn');
  };

  const handleGift = async (neighborId: string) => {
    await recordGiftCollect(myId, neighborId).catch(() => {});
    setInteractions((prev) => ({
      ...prev,
      [neighborId]: { ...prev[neighborId], giftCollectedToday: true },
    }));
    dispatch({ type: 'COLLECT_GIFT', neighborId });
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
      <h2 className="panel-title">🌾 Друзі фермери</h2>

      {/* Tabs */}
      <div className="neighbor-tabs">
        <button
          className={`neighbor-tab ${activeTab === 'neighbors' ? 'neighbor-tab-active' : ''}`}
          onClick={() => setActiveTab('neighbors')}
        >
          👥 Друзі
        </button>
        <button
          className={`neighbor-tab ${activeTab === 'leaderboard' ? 'neighbor-tab-active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Рейтинг
        </button>
        <button
          className={`neighbor-tab ${activeTab === 'invite' ? 'neighbor-tab-active' : ''}`}
          onClick={() => setActiveTab('invite')}
        >
          📨 Запросити
        </button>
      </div>

      {/* Tab: Friends */}
      {activeTab === 'neighbors' && (
        <div className="neighbor-list">
          {loading && <p style={{ textAlign: 'center', color: '#999' }}>Завантаження...</p>}

          {!loading && friends.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>👥</p>
              <p style={{ fontSize: '14px' }}>У вас ще немає друзів-фермерів</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                Перейдіть на вкладку «📨 Запросити» і надішліть посилання друзям!
              </p>
            </div>
          )}

          {friends.map((n) => {
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
                    onClick={() => handleHelp(n.id)}
                  >
                    {inter.helpedToday ? '✅' : `🌧️ +${HELP_COIN_REWARD}💰`}
                  </button>
                  <button
                    className="btn btn-sell"
                    disabled={inter.giftCollectedToday}
                    onClick={() => handleGift(n.id)}
                  >
                    {inter.giftCollectedToday ? '✅' : `🎁 +${GIFT_COIN_REWARD}💰`}
                  </button>
                </div>
              </div>
            );
          })}
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
            Надішліть це посилання друзям, щоб стати друзями-фермерами! 🏡
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
            👥 Друзів-фермерів: {friends.length}
          </p>
        </div>
      )}
    </div>
  );
}
