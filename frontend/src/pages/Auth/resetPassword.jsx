import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import { authApi } from "../../services/api";
import { AuthVisual } from "./login";
import "./auth.css";

export default function ResetPassword({ user }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitHandler(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("This password-reset link is invalid or has expired.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.confirmPasswordReset({ token, ...form });
      setMessage(result.message);
      setForm({ password: "", confirmPassword: "" });
    } catch (requestError) {
      setError(requestError?.message || "We could not reset your password. Please request a new link.");
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
            <span className="eyebrow">CHOOSE A NEW PASSWORD</span>
            <h1>Secure your account.</h1>
            <p>Create a new password, then enter it again to confirm it.</p>
          </div>
          <form className="auth-form" onSubmit={submitHandler}>
            <label>
              New password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
                minLength="8"
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                autoComplete="new-password"
                minLength="8"
                required
              />
            </label>
            {message && <p className="form-message success" role="status">{message} <Link to="/Auth/login">Sign in</Link></p>}
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading || Boolean(message)}>
              {loading ? "Changing password…" : "Change password →"}
            </button>
          </form>
          <p className="auth-switch"><Link to="/Auth/login">Back to sign in</Link></p>
        </section>
        <AuthVisual
          title="One link. One fresh start."
          text="Your reset link is protected, single-use, and expires after five minutes."
        />
      </main>
    </div>
  );
}
