import { useState, type FormEvent } from 'react';
import { login } from './auth';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phone, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🗣️</div>
          <h1>Swar-Vani</h1>
          <p className="login-tagline">Voice-first AI Procurement for Bharat</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="phone">📱 Phone Number</label>
            <div className="phone-input">
              <span className="country-code">+91</span>
              <input
                id="phone"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                autoFocus
                maxLength={10}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">🔒 Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <button type="submit" disabled={loading || phone.length < 10} className="login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="demo-btn"
          onClick={() => { window.location.href = window.location.pathname + '?demo=true'; }}
        >
          🎬 Watch Live Demo
        </button>

        <div className="login-footer">
          <p>Demo credentials:</p>
          <code>Phone: 9876543210 | Password: SwarVani@2026</code>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
          padding: 1rem;
        }
        .login-card {
          background: #1e1e2e;
          border-radius: 16px;
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          border: 1px solid #333;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-logo {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        .login-header h1 {
          background: linear-gradient(90deg, #FF9933, #fff, #138808);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 2rem;
          margin: 0;
        }
        .login-tagline {
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .input-group label {
          color: #ccc;
          font-size: 0.85rem;
        }
        .phone-input {
          display: flex;
          align-items: center;
          background: #2a2a3e;
          border-radius: 8px;
          border: 1px solid #444;
          overflow: hidden;
        }
        .country-code {
          padding: 0.75rem 0.75rem;
          color: #FF9933;
          font-weight: 600;
          border-right: 1px solid #444;
          background: #252535;
        }
        .phone-input input {
          border: none;
          background: transparent;
          padding: 0.75rem;
          color: #fff;
          font-size: 1rem;
          width: 100%;
          outline: none;
        }
        .input-group > input {
          background: #2a2a3e;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 0.75rem;
          color: #fff;
          font-size: 1rem;
          outline: none;
        }
        .input-group > input:focus, .phone-input:focus-within {
          border-color: #FF9933;
        }
        .login-error {
          color: #ff4444;
          font-size: 0.85rem;
          padding: 0.5rem;
          background: rgba(255,68,68,0.1);
          border-radius: 6px;
        }
        .login-btn {
          background: linear-gradient(90deg, #FF9933, #FF6600);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.85rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: opacity 0.2s;
        }
        .login-btn:hover:not(:disabled) { opacity: 0.9; }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.5rem 0;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #444;
        }
        .login-divider span {
          color: #666;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .demo-btn {
          width: 100%;
          background: transparent;
          color: #FF9933;
          border: 2px solid #FF9933;
          border-radius: 8px;
          padding: 0.8rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          font-family: inherit;
        }
        .demo-btn:hover {
          background: rgba(255,153,51,0.12);
          box-shadow: 0 0 20px rgba(255,153,51,0.15);
          transform: translateY(-1px);
        }
        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
          color: #666;
          font-size: 0.8rem;
        }
        .login-footer code {
          display: block;
          margin-top: 0.3rem;
          color: #888;
          font-size: 0.75rem;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
