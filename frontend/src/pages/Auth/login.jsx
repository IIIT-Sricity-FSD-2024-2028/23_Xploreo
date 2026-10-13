import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar';
import { authApi } from '../../services/api';
import './auth.css';

const destinationForRole = {
  traveller: '/Traveller/dashboard',
  guide: '/Guide/dashboard',
  hotel: '/Hotel/bookings',
  experience: '/Experience/dashboard',
};

export default function Login({ user, onAuthenticated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitHandler(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.login(form);
      const authenticatedUser = result?.user || result;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('xploreoUser', JSON.stringify(authenticatedUser));
      }
      onAuthenticated?.(authenticatedUser);
      navigate(destinationForRole[authenticatedUser.role] || '/');
    } catch (requestError) {
      setError(requestError?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Navbar user={user} />
      <main className="auth-layout">
        <section className="auth-panel">
          <div className="auth-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h1>Continue your journey.</h1>
            <p>Log in to plan, manage, and enjoy every trip with Xploreo.</p>
          </div>

          <form className="auth-form" onSubmit={submitHandler}>
            <label>
              Username or email
              <input
                name="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Show or hide password"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <div className="auth-options">
              <label className="remember">
                <input type="checkbox" /> Keep me signed in
              </label>
              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>

            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="auth-switch">
            New to Xploreo? <Link to="/Auth/register">Create an account</Link>
          </p>
        </section>

        <AuthVisual
          title="Every trip starts with a story."
          text="Keep yours organised, personalised, and ready for the next adventure."
        />
      </main>
    </div>
  );
}

export function AuthVisual({ title, text }) {
  return (
    <aside className="auth-visual" aria-label="Travel media placeholder">
      <div className="media-placeholder">
        <span>YOUR IMAGE OR VIDEO</span>
        <small>Replace this area with your travel photo or video</small>
      </div>
      <div className="visual-copy">
        <span className="visual-mark">✦</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </aside>
  );
}
