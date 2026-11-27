import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/navbar";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth/auth.css";

const destinationForRole = {
  superadmin: "/superadmin/dashboard",
  nontechadmin: "/nta/dashboard",
  techadmin: "/tech-admin/dashboard",
  guide: "/guide/dashboard",
  hotel: "/hotel/dashboard",
  experience: "/experience/home",
  traveller: "/Traveller/dashboard",
};

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const portalUrl = destinationForRole[normalizedRole] || "/";

  return (
    <div className="auth-page">
      <Navbar user={user} />
      <main className="auth-layout" style={{ justifyContent: "center", alignItems: "center", padding: "40px 20px" }}>
        <section
          className="auth-panel"
          style={{
            maxWidth: "520px",
            textAlign: "center",
            padding: "48px 36px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "20px",
            boxShadow: "0 10px 40px rgba(15, 76, 76, 0.08)",
            border: "1px solid rgba(15, 76, 76, 0.12)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
          <span className="eyebrow" style={{ color: "#d97706", fontWeight: 700 }}>ACCESS RESTRICTED</span>
          <h1 style={{ fontSize: "1.75rem", margin: "12px 0 8px", color: "#103f45" }}>
            Insufficient Permissions
          </h1>
          <p style={{ color: "#547074", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "28px" }}>
            Your account ({user?.role || "Guest"}) does not have authorization to view this page.
            If you need access to this portal, please contact the platform administrator.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to={portalUrl}
              className="navbar-btn"
              style={{
                padding: "10px 20px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Go to Your Dashboard
            </Link>
            <button
              type="button"
              onClick={logout}
              style={{
                background: "transparent",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "10px 18px",
                color: "#475569",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.88rem",
              }}
            >
              Switch Account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
