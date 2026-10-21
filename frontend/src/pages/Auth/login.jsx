import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import { authApi } from "../../services/api";
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

export default function Login({ user, onAuthenticated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitHandler(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
      };
      const result = await authApi.login(payload);
      const authenticatedUser = result?.user || result;
      if (result?.token && !authenticatedUser.token) {
        authenticatedUser.token = result.token;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("xploreoUser", JSON.stringify(authenticatedUser));
        if (result?.token) {
          localStorage.setItem("xploreoToken", result.token);
        }
      }
      onAuthenticated?.(authenticatedUser);
      navigate(destinationForRole[authenticatedUser.role] || "/");
    } catch (requestError) {
      setError(requestError?.message || "Login failed. Please check your credentials.");
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
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  minLength="6"
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
              <label className="remember">
                <input type="checkbox" /> Keep me signed in
              </label>
              <Link className="text-button" to="/Auth/forgot-password">Forgot password?</Link>
            </div>
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in →"}
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
