import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import {
  clearResetFeedback,
  confirmPasswordReset,
  selectResetError,
  selectResetLoading,
  selectResetMessage,
} from "../../features/authSlice.js";
import { AuthVisual } from "./login";
import "./auth.css";

export default function ResetPassword({ user }) {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [localError, setLocalError] = useState("");
  const message = useSelector(selectResetMessage) || "";
  const resetError = useSelector(selectResetError) || "";
  const loading = useSelector(selectResetLoading);
  const error = localError || resetError;

  useEffect(() => {
    dispatch(clearResetFeedback());
    return () => {
      dispatch(clearResetFeedback());
    };
  }, [dispatch]);

  async function submitHandler(event) {
    event.preventDefault();
    setLocalError("");
    if (!token) {
      setLocalError("This password-reset link is invalid or has expired.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    const res = await dispatch(confirmPasswordReset({ token, ...form }));
    if (confirmPasswordReset.fulfilled.match(res)) {
      setForm({ password: "", confirmPassword: "" });
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
