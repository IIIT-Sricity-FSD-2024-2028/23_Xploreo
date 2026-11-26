import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import {
  clearResetFeedback,
  requestPasswordReset,
  selectResetError,
  selectResetLoading,
  selectResetMessage,
} from "../../features/authSlice.js";
import { AuthVisual } from "./login";
import "./auth.css";

export default function ForgotPassword({ user }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const message = useSelector(selectResetMessage) || "";
  const error = useSelector(selectResetError) || "";
  const loading = useSelector(selectResetLoading);

  useEffect(() => {
    dispatch(clearResetFeedback());
    return () => {
      dispatch(clearResetFeedback());
    };
  }, [dispatch]);

  async function submitHandler(event) {
    event.preventDefault();
    await dispatch(requestPasswordReset({ email: email.trim() }));
  }

  return (
    <div className="auth-page">
      <Navbar user={user} />
      <main className="auth-layout">
        <section className="auth-panel">
          <div className="auth-heading">
            <span className="eyebrow">PASSWORD RECOVERY</span>
            <h1>Reset your password.</h1>
            <p>Enter your registered email address. We’ll send a secure link that expires after 5 minutes.</p>
          </div>
          <form className="auth-form" onSubmit={submitHandler}>
            <label>
              Email address
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            {message && <p className="form-message success" role="status">{message}</p>}
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link →"}
            </button>
          </form>
          <p className="auth-switch"><Link to="/Auth/login">Back to sign in</Link></p>
        </section>
        <AuthVisual
          title="Get back to your journey."
          text="For your security, every reset link can be used only once and expires in five minutes."
        />
      </main>
    </div>
  );
}
