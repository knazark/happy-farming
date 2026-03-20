import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFarmerId, setFarmerId, loginByNameAndPassword } from '../firebase/db';

export function LoginScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'menu' | 'login'>('menu');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNewGame = () => {
    localStorage.removeItem('happyFarmer_save');
    createFarmerId();
    navigate('/profile');
  };

  const handleLogin = async () => {
    if (!name.trim() || !password) {
      setError("Введіть ім'я та пароль");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const farmerId = await loginByNameAndPassword(name, password);
      if (farmerId) {
        localStorage.removeItem('happyFarmer_save');
        setFarmerId(farmerId);
        navigate('/game');
      } else {
        setError("Невірне ім'я або пароль");
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError("Помилка з'єднання. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">🌾</div>
          <h1 className="login-title">Happy Farming</h1>
          <p className="login-subtitle">Ваша маленька ферма</p>

          <button className="login-btn login-btn-new" onClick={handleNewGame}>
            🌱 Нова гра
          </button>
          <button className="login-btn login-btn-login" onClick={() => setMode('login')}>
            🔑 Увійти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h2 className="login-title" style={{ fontSize: '22px' }}>Увійти в акаунт</h2>

        <div className="login-form">
          <input
            className="login-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ім'я"
            maxLength={20}
            autoFocus
          />
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          {error && <div className="login-error">{error}</div>}

          <button
            className="login-btn login-btn-new"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '⏳ Вхід...' : '✅ Увійти'}
          </button>
          <button
            className="login-btn login-btn-back"
            onClick={() => { setMode('menu'); setError(''); }}
          >
            ← Назад
          </button>
        </div>
      </div>
    </div>
  );
}
