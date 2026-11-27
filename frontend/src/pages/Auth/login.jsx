import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import { useAuth } from "../../context/AuthContext.jsx";
import "./auth.css";

const destinationForRole = {
  traveller: "/Traveller/dashboard",
  guide: "/guide/dashboard",
  hotel: "/hotel/dashboard",
  experience: "/experience/home",
  superadmin: "/superadmin/dashboard",
  nontechadmin: "/nta/dashboard",
  techadmin: "/tech-admin/dashboard",
};

const portalPrefixForRole = {
  traveller: "/Traveller",
  guide: "/guide",
  hotel: "/hotel",
  experience: "/experience",
  superadmin: "/superadmin",
  nontechadmin: "/nta",
  techadmin: "/tech-admin",
};

function resolvePostLoginTarget(role, fromPath) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const fallback = destinationForRole[normalizedRole] || "/";
  const allowedPrefix = portalPrefixForRole[normalizedRole];
  if (
    fromPath &&
    allowedPrefix &&
    fromPath.toLowerCase().startsWith(allowedPrefix.toLowerCase())
  ) {
    return fromPath;
  }
  return fallback;
}

export default function Login({ user: propUser, onAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated, loading: authLoading, error: authError, login, clearError } = useAuth();
  const activeUser = propUser && propUser.role !== "default" ? propUser : authUser;
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const fromPath = location.state?.from?.pathname;

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (isAuthenticated && activeUser?.role) {
    return <Navigate to={resolvePostLoginTarget(activeUser.role, fromPath)} replace />;
  }

  const error = localError || authError || "";

  async function submitHandler(event) {
    event.preventDefault();
    if (authLoading) return;
    setLocalError("");
    clearError();

    const trimmedUsername = form.username.trim();
    if (!trimmedUsername) {
      setLocalError("Please enter your username or email.");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    try {
      const authenticatedUser = await login({
        username: trimmedUsername,
        password: form.password,
      });
      onAuthenticated?.(authenticatedUser);
      navigate(resolvePostLoginTarget(authenticatedUser.role, fromPath), { replace: true });
    } catch (requestError) {
      setLocalError(requestError?.message || "Login failed. Please check your credentials.");
    }
  }

  return (
    <div className="auth-page">
      <Navbar user={activeUser} />
      <main className="auth-layout">
        <section className="auth-panel">
          <div className="auth-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h1>Continue your journey.</h1>
            <p>Log in to plan, manage, and enjoy every trip with Xploreo.</p>
          </div>
          <form className="auth-form" onSubmit={submitHandler} noValidate>
            <label>
              Username or email
              <input
                name="username"
                value={form.username}
                onChange={(e) => {
                  setLocalError("");
                  setForm({ ...form, username: e.target.value });
                }}
                autoComplete="username"
                placeholder="you@example.com"
                disabled={authLoading}
                required
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => {
                    setLocalError("");
                    setForm({ ...form, password: e.target.value });
                  }}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  minLength={6}
                  disabled={authLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Show or hide password"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <div className="auth-options">
              <Link className="text-button" to="/Auth/forgot-password">Forgot password?</Link>
            </div>
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={authLoading}>
              {authLoading ? "Signing in…" : "Sign in →"}
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
    <aside className="auth-visual" aria-label="Sailboat on calm water at sunset">
      <img className="auth-visual-image" src="/images/auth-sailboat-sunset.png" alt="Sailboat on calm water at sunset" />
      <div className="visual-copy">
        <span className="visual-mark">✦</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </aside>
  );
}
