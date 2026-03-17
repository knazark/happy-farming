import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { AVATARS } from '../constants/neighbors';

interface ProfileEditorProps {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const { state, dispatch } = useGame();
  const [name, setName] = useState(state.profile.name);
  const [avatar, setAvatar] = useState(state.profile.avatar);
  const [password, setPassword] = useState(state.profile.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    dispatch({
      type: 'SET_PROFILE',
      profile: { name: name.trim() || 'Фермер', avatar, password: password || undefined },
    });
    onClose();
  };

  return (
    <div className="crop-selector-overlay" onClick={onClose}>
      <div className="crop-selector" onClick={(e) => e.stopPropagation()}>
        <h3 className="crop-selector-title">Ваш профіль</h3>
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
                style={{
                  background: 'none', border: '1px solid #ccc', borderRadius: '8px',
                  padding: '6px 10px', cursor: 'pointer', fontSize: '16px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
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
          <button className="btn btn-buy profile-save" onClick={handleSave}>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}
