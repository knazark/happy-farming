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

  const handleSave = () => {
    dispatch({ type: 'SET_PROFILE', profile: { name: name.trim() || 'Фермер', avatar } });
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
