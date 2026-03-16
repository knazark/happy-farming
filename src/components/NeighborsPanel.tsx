import { useState, useEffect } from 'react';
import { showToast } from './Toast';
import {
  getFarmerId,
  getLeaderboard,
  type FarmerProfile,
} from '../firebase/db';

type Tab = 'leaderboard' | 'invite';

export function NeighborsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const myId = getFarmerId();

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
      <h2 className="panel-title">🌾 Рейтинг фермерів</h2>

      {/* Tabs */}
      <div className="neighbor-tabs">
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
        </div>
      )}
    </div>
  );
}
