import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/navbar";
import { useAuth } from "../../context/AuthContext.jsx";
import { AuthVisual } from "./login";
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

const initialForm = {
  name: "",
  username: "",
  email: "",
  phone: "",
  role: "traveller",
  location: "",
  password: "",
  confirmPassword: "",
};

const PARTNER_ROLES = ["guide", "hotel", "experience"];

export default function Register({ user }) {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const isPartnerRole = PARTNER_ROLES.includes(form.role);

  async function submitHandler(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (isPartnerRole && !form.location.trim()) {
      setError("Please enter the region/city you'll be operating in.");
      return;
    }

    setLoading(true);
    try {
      const details = { ...form };
      delete details.confirmPassword;
      details.username = details.username.trim();
      details.email = details.email.trim();
      details.name = details.name.trim();
      details.phone = details.phone.trim();
      details.location = details.location.trim();
      if (!isPartnerRole || !details.location) delete details.location;
      const authenticatedUser = await register(details);
      navigate(destinationForRole[authenticatedUser.role] || "/");
    } catch (requestError) {
      setError(requestError?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Navbar user={user} />
      <main className="auth-layout register-layout">
        <section className="auth-panel">
          <div className="auth-heading">
            <span className="eyebrow">CREATE ACCOUNT</span>
            <h1>Let’s get you exploring.</h1>
            <p>Create your Xploreo account in a few simple steps.</p>
          </div>

          <form className="auth-form register-form" onSubmit={submitHandler}>
            <label>
              Full name
              <input
                name="name"
                value={form.name}
                onChange={change}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </label>

            <label>
              Username
              <input
                name="username"
                value={form.username}
                onChange={change}
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={change}
                placeholder="9876543210"
                autoComplete="tel"
                required
              />
            </label>

            <label>
              I am joining as
              <select name="role" value={form.role} onChange={change}>
                <option value="traveller">Traveller</option>
                <option value="guide">Guide</option>
                <option value="hotel">Hotel partner</option>
                <option value="experience">Experience partner</option>
              </select>
            </label>

            {isPartnerRole && (
              <label>
                Operating region / city
                <input
                  name="location"
                  value={form.location}
                  onChange={change}
                  placeholder="e.g. Goa, Jaipur, Kerala"
                  required
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={change}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={change}
                placeholder="Repeat your password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account →"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/Auth/login">Log in</Link>
          </p>
        </section>

        <AuthVisual
          title="Find your next favourite place."
          text="Plan every detail, from a first idea to a beautiful journey."
        />
      </main>
    </div>
  );
}
