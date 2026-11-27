import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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

const SELF_SIGNUP_ROLES = ["traveller", "guide", "hotel", "experience"];
const PARTNER_ROLES = ["guide", "hotel", "experience"];
const PHONE_PATTERN = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;

export default function Register({ user: propUser, onAuthenticated }) {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, loading: authLoading, error: authError, register, clearError } = useAuth();
  const activeUser = propUser && propUser.role !== "default" ? propUser : authUser;
  const [form, setForm] = useState(initialForm);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (isAuthenticated && activeUser?.role) {
    const normalizedRole = String(activeUser.role || "").trim().toLowerCase();
    return <Navigate to={destinationForRole[normalizedRole] || "/"} replace />;
  }

  const error = localError || authError || "";

  const change = (event) => {
    setLocalError("");
    clearError();
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const isPartnerRole = PARTNER_ROLES.includes(form.role);

  async function submitHandler(event) {
    event.preventDefault();
    if (authLoading) return;
    setLocalError("");
    clearError();

    const trimmedName = form.name.trim();
    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim();
    const normalizedPhone = form.phone.replace(/[\s()-]/g, "");
    const trimmedLocation = form.location.trim();

    if (!trimmedName) {
      setLocalError("Full name is required.");
      return;
    }
    if (!trimmedUsername) {
      setLocalError("Username is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setLocalError("Phone must be a valid 10-digit mobile number.");
      return;
    }
    if (!SELF_SIGNUP_ROLES.includes(form.role)) {
      setLocalError("Selected account role is not permitted for self-registration.");
      return;
    }
    if (isPartnerRole && !trimmedLocation) {
      setLocalError("Please enter the region/city you'll be operating in.");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    try {
      const details = {
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        phone: normalizedPhone,
        role: form.role,
        password: form.password,
      };
      if (isPartnerRole && trimmedLocation) {
        details.location = trimmedLocation;
      }
      const authenticatedUser = await register(details);
      onAuthenticated?.(authenticatedUser);
      const normalizedRole = String(authenticatedUser.role || "").trim().toLowerCase();
      navigate(destinationForRole[normalizedRole] || "/", { replace: true });
    } catch (requestError) {
      setLocalError(requestError?.message || "Registration failed. Please try again.");
    }
  }

  return (
    <div className="auth-page">
      <Navbar user={activeUser} />
      <main className="auth-layout register-layout">
        <section className="auth-panel">
          <div className="auth-heading">
            <span className="eyebrow">CREATE ACCOUNT</span>
            <h1>Let’s get you exploring.</h1>
            <p>Create your Xploreo account in a few simple steps.</p>
          </div>

          <form className="auth-form register-form" onSubmit={submitHandler} noValidate>
            <label>
              Full name
              <input
                name="name"
                value={form.name}
                onChange={change}
                placeholder="Your full name"
                autoComplete="name"
                disabled={authLoading}
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
                disabled={authLoading}
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
                disabled={authLoading}
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
                disabled={authLoading}
                required
              />
            </label>

            <label>
              I am joining as
              <select name="role" value={form.role} onChange={change} disabled={authLoading}>
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
                  disabled={authLoading}
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
                disabled={authLoading}
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
                disabled={authLoading}
                required
              />
            </label>

            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={authLoading}>
              {authLoading ? "Creating account…" : "Create account →"}
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
