import { useState, useEffect, useMemo } from 'react';
import { showToast } from './Toast';
import {
  getFarmerId,
  getLeaderboard,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  type FarmerProfile,
} from '../firebase/db';
import { useFriends } from '../hooks/useFriends';

type Tab = 'friends' | 'leaderboard' | 'invite';

interface NeighborsPanelProps {
  onVisitFriend: (friendId: string) => void;
}

export function NeighborsPanel({ onVisitFriend }: NeighborsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [leaderboard, setLeaderboard] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const myId = getFarmerId();
  const { friends, pendingRequests, loading: friendsLoading, refresh: refreshFriends } = useFriends();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const friendIds = useMemo(() => new Set(friends.map(f => f.id)), [friends]);

  const handleSendRequest = async (farmerId: string) => {
    setProcessingId(farmerId);
    try {
      const ok = await sendFriendRequest(myId, farmerId);
      if (ok) {
        showToast('📨 Запит надіслано!', 'info');
        setSentRequests(prev => new Set(prev).add(farmerId));
      } else {
        showToast('Вже надіслано або вже друзі', 'info');
      }
    } catch {
      showToast('Помилка з\'єднання', 'info');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccept = async (farmerId: string) => {
    setProcessingId(farmerId);
    try {
      await acceptFriendRequest(myId, farmerId);
      showToast('✅ Друга додано!', 'earn');
      refreshFriends();
    } catch {
      showToast('Помилка з\'єднання', 'info');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (farmerId: string) => {
    setProcessingId(farmerId);
    try {
      await declineFriendRequest(myId, farmerId);
      showToast('Запит відхилено', 'info');
      refreshFriends();
    } catch {
      showToast('Помилка з\'єднання', 'info');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFriend = async (farmerId: string) => {
    setProcessingId(farmerId);
    try {
      await removeFriend(myId, farmerId);
      showToast('Друга видалено', 'info');
      refreshFriends();
    } catch {
      showToast('Помилка з\'єднання', 'info');
    } finally {
      setProcessingId(null);
    }
  };

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
      <h2 className="panel-title">👥 Друзі та рейтинг</h2>

      {/* Tabs */}
      <div className="neighbor-tabs">
        <button
          className={`neighbor-tab ${activeTab === 'friends' ? 'neighbor-tab-active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          👥 Друзі
          {pendingRequests.length > 0 && (
            <span style={{
              background: '#F44336', color: '#fff', borderRadius: '10px',
              padding: '1px 6px', fontSize: '11px', marginLeft: '4px',
            }}>
              {pendingRequests.length}
            </span>
          )}
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
      {activeTab === 'friends' && (
        <div>
          {friendsLoading && (
            <p style={{ textAlign: 'center', color: '#999' }}>Завантаження...</p>
          )}

          {/* Pending friend requests */}
          {!friendsLoading && pendingRequests.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '13px', fontWeight: 700, color: '#F59E0B',
                padding: '6px 4px', borderBottom: '1px solid #eee',
              }}>
                📨 Запити на дружбу
              </div>
              {pendingRequests.map((requester) => (
                <div
                  key={requester.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '8px 4px', gap: '8px',
                    background: 'rgba(255, 243, 224, 0.5)',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{requester.avatar}</span>
                  <span style={{ flex: 1 }}>{requester.name}</span>
                  <span style={{ color: '#666', fontSize: '12px' }}>Рів.{requester.level}</span>
                  <button
                    className="btn btn-buy"
                    onClick={() => handleAccept(requester.id)}
                    disabled={processingId === requester.id}
                    style={{ padding: '3px 10px', fontSize: '12px' }}
                  >
                    {processingId === requester.id ? '...' : '✅ Прийняти'}
                  </button>
                  <button
                    onClick={() => handleDecline(requester.id)}
                    disabled={processingId === requester.id}
                    style={{
                      padding: '3px 10px', fontSize: '12px', border: '1px solid #ccc',
                      borderRadius: '8px', background: '#fff', cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Friends list */}
          {!friendsLoading && friends.length === 0 && pendingRequests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: '#999', marginBottom: '12px' }}>
                У вас поки немає друзів. Запросіть друга!
              </p>
              <button
                className="btn btn-buy"
                onClick={() => setActiveTab('invite')}
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                📨 Запросити друга
              </button>
            </div>
          )}
          {!friendsLoading && friends.length > 0 && (
            <div>
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="leaderboard-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 4px',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{friend.avatar}</span>
                  <span style={{ flex: 1 }}>{friend.name}</span>
                  <span style={{ color: '#666', marginRight: '8px' }}>Рів.{friend.level}</span>
                  <button
                    className="btn btn-buy"
                    onClick={() => onVisitFriend(friend.id)}
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                  >
                    Відвідати
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    disabled={processingId === friend.id}
                    style={{
                      padding: '4px 8px', fontSize: '12px', border: '1px solid #e0e0e0',
                      borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#999',
                    }}
                    title="Видалити з друзів"
                  >
                    {processingId === friend.id ? '...' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div>
          {loading && <p style={{ textAlign: 'center', color: '#999' }}>Завантаження...</p>}
          {!loading && leaderboard.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999' }}>Поки що нікого немає. Спробуйте пізніше.</p>
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
                  <td style={{ textAlign: 'right', color: '#666' }}>Рів.{farmer.level}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#F59E0B' }}>🏆{farmer.score}</td>
                  <td style={{ width: '90px', textAlign: 'right' }}>
                    {farmer.id !== myId && !friendIds.has(farmer.id) && !sentRequests.has(farmer.id) && (
                      <button
                        className="btn btn-buy"
                        onClick={() => handleSendRequest(farmer.id)}
                        disabled={processingId === farmer.id}
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        {processingId === farmer.id ? '...' : '➕ Додати'}
                      </button>
                    )}
                    {farmer.id !== myId && sentRequests.has(farmer.id) && (
                      <span style={{ fontSize: '11px', color: '#999' }}>📨 Надіслано</span>
                    )}
                    {farmer.id !== myId && friendIds.has(farmer.id) && (
                      <span style={{ fontSize: '11px', color: '#4CAF50' }}>✓ Друг</span>
                    )}
                  </td>
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
