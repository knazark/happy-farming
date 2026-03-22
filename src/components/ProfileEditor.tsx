import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../state/GameContext';
import { AVATARS } from '../constants/neighbors';
import { clearFarmerId, ensureProfileRTDB, isNameTaken, getFarmerIdIfExists, saveGameState } from '../firebase/rtdb';

interface ProfileEditorProps {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [name, setName] = useState(state.profile.name);
  const [avatar, setAvatar] = useState(state.profile.avatar);
  const [password, setPassword] = useState(state.profile.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim() || 'Фермер';
    if (!password.trim()) {
      setError('Введіть пароль для захисту акаунта');
      return;
    }
    if (!trimmedName) {
      setError('Введіть ім\'я');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Check duplicate name (only for new profiles or name change)
      const isNew = !state.profile.name;
      const nameChanged = state.profile.name && state.profile.name.toLowerCase() !== trimmedName.toLowerCase();
      if (isNew || nameChanged) {
        const taken = await isNameTaken(trimmedName);
        if (taken) {
          setError('Це ім\'я вже зайняте — оберіть інше');
          setSaving(false);
          return;
        }
      }

      const profile = { name: trimmedName, avatar, password: password.trim() };
      dispatch({ type: 'SET_PROFILE', profile });
      // Create/update Firestore profile + gameState in one call
      const farmerId = getFarmerIdIfExists();
      if (farmerId) await ensureProfileRTDB(farmerId, { ...state, profile } as any);
    } catch { /* ignore */ }
    setSaving(false);
    onClose();
  };

  return (
    <>
      <h2 className="crop-selector-title">Ваш профіль</h2>
      <div className="profile-form">
        <label className="profile-label">
          Ім'я:
          <input
            className="profile-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введіть ім'я"
            maxLength={20}
          />
        </label>
        <label className="profile-label">
          Пароль:
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              className="profile-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Придумайте пароль"
              maxLength={30}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
              style={{
                background: 'none', border: '1px solid #ccc', borderRadius: '8px',
                padding: '6px 10px', cursor: 'pointer', fontSize: '16px',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
        {error && (
          <div style={{ fontSize: '13px', color: '#E53935', fontWeight: 600, margin: '-4px 0 4px' }}>
            {error}
          </div>
        )}
        <div style={{ fontSize: '12px', color: '#888', margin: '-4px 0 8px' }}>
          Потрібен для входу з іншого пристрою
        </div>
        <div className="profile-label">Аватар:</div>
        <div className="crop-selector-grid">
          {AVATARS.map((a) => (
            <button
              key={a}
              className={`crop-option ${a === avatar ? 'crop-option-selected' : ''}`}
              onClick={() => setAvatar(a)}
            >
              <span className="crop-option-emoji">{a}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-buy profile-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Збереження...' : 'Зберегти'}
        </button>
        {state.profile.password ? (
          <button
            className="btn profile-logout"
            style={{
              marginTop: '10px',
              background: 'none',
              border: '1px solid #E53935',
              color: '#E53935',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              width: '100%',
            }}
            onClick={async () => {
              // Save to RTDB BEFORE clearing ID (so data is synced for other devices)
              const fid = getFarmerIdIfExists();
              if (fid) { try { await saveGameState(fid, state); } catch { /* ignore */ } }
              clearFarmerId();
              navigate('/');
            }}
          >
            🚪 Вийти з акаунта
          </button>
        ) : (
          <button
            className="btn"
            style={{
              marginTop: '10px',
              background: 'none',
              border: '1px solid #888',
              color: '#555',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              width: '100%',
            }}
            onClick={() => {
              clearFarmerId();
              navigate('/');
            }}
          >
            ← Назад
          </button>
        )}
      </div>
    </>
  );
}
