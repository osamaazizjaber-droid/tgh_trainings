import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import './Login.css';

export default function AdminLogin({ setTrainerId }) {
  const { t } = useLanguage();
  const [role, setRole] = useState('admin'); // 'admin' or 'trainer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (role === 'admin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? t('invalid_credentials')
          : error.message
        );
      }
    } else {
      // Trainer Login
      const { data: trainerId, error } = await supabase.rpc('login_trainer', { p_username: email, p_password: password });
      
      if (error || !trainerId) {
        setError(t('invalid_credentials') || 'Invalid trainer credentials');
      } else {
        localStorage.setItem('trainer_id', trainerId);
        if (setTrainerId) setTrainerId(trainerId);
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-blob blob-1" />
        <div className="login-blob blob-2" />
        <div className="login-blob blob-3" />
      </div>

      <div className="login-card animate-slide-up">
        <div className="login-header">
          <div className="login-icon">
            <img src="/logo.png" alt="TGH Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{t('tgh_trainings_center')}</h1>
          <p>{t('sign_in_desc')}</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button type="button" className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setRole('admin')}>Admin</button>
            <button type="button" className={`btn ${role === 'trainer' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setRole('trainer')}>Trainer</button>
          </div>

          <div className="form-group">
            <label htmlFor="login-email">{role === 'admin' ? t('email_address') : 'Username'}</label>
            <input
              id="login-email"
              type={role === 'admin' ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'admin' ? "admin@example.com" : "trainer_username"}
              required
              autoComplete={role === 'admin' ? 'email' : 'username'}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">{t('password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm" />
                {t('signing_in')}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                {t('sign_in')}
              </>
            )}
          </button>
        </form>

        <p className="login-footer">
          TGH Trainings Center &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
