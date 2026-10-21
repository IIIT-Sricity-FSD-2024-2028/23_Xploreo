import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import { authApi } from "../../services/api";
import { AuthVisual } from "./login";
import "./auth.css";

export default function ForgotPassword({ user }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitHandler(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await authApi.requestPasswordReset({ email: email.trim() });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError?.message || "We could not send a reset email. Please try again.");
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
