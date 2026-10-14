import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./navbar.css";

export default function Navbar({ user: propUser } = {}) {
    const user = propUser || (() => {
        if (typeof localStorage !== "undefined") {
            try {
                return JSON.parse(localStorage.getItem("xploreoUser")) || { username: "Guest", role: "default" };
            } catch {
                return { username: "Guest", role: "default" };
            }
        }
        return { username: "Guest", role: "default" };
    })();

    const role = (user?.role || "default").toLowerCase();

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-logo">
                <img src={logo} alt="Logo" />
                <div className="navbar-title">Xploreo</div>
            </Link>
            <div className="navbar-links">
                {(role === "default" || !role) && (
                    <>
                        <Link to="/" className="navbar-link">Home</Link>
                        <Link to="/Home/partners" className="navbar-link">Partners</Link>
                        <Link to="/Home/tours" className="navbar-link">Tours</Link>
                        <Link to="/Home/support" className="navbar-link">Support</Link>
                        <Link to="/Auth/login" className="navbar-link">Sign In</Link>
                    </>
                )}
                {role === "traveller" && (
                    <>
                        <Link to="/Traveller/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/Traveller/browse" className="navbar-link">Browse</Link>
                        <Link to="/Traveller/bookings" className="navbar-link">Bookings</Link>
                        <Link to="/Traveller/trips" className="navbar-link">Trips</Link>
                    </>
                )}
                {role === "guide" && (
                    <>
                        <Link to="/Guide/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/Guide/trips" className="navbar-link">Trips</Link>
                        <Link to="/Guide/schedule" className="navbar-link">Schedule</Link>
                        <Link to="/Guide/earnings" className="navbar-link">Earnings</Link>
                        <Link to="/Guide/reviews" className="navbar-link">Reviews</Link>   
                    </>
                )}
                {role === "nontechadmin" && (
                    <>
                        <Link to="/NonTechAdmin/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/NonTechAdmin/guides" className="navbar-link">Guides</Link>
                        <Link to="/NonTechAdmin/plans" className="navbar-link">Plans</Link>
                        <Link to="/NonTechAdmin/travelpackages" className="navbar-link">Travel Packages</Link>
                        <Link to="/NonTechAdmin/trips" className="navbar-link">Trips</Link>
                    </>
                )}
                {role === "techadmin" && (
                    <>
                        <Link to="/TechAdmin/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/TechAdmin/activity" className="navbar-link">Activity</Link>
                        <Link to="/TechAdmin/logs" className="navbar-link">Logs</Link>
                        <Link to="/TechAdmin/profile" className="navbar-link">Profile</Link>
                        <Link to="/TechAdmin/tickets" className="navbar-link">Tickets</Link>
                    </>
                )}
                {role === "superadmin" && (
                    <>
                        <Link to="/SuperAdmin/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/SuperAdmin/finance" className="navbar-link">Users</Link>
                        <Link to="/SuperAdmin/guides" className="navbar-link">Guides</Link>
                        <Link to="/SuperAdmin/plans" className="navbar-link">Plans</Link>
                        <Link to="/SuperAdmin/trips" className="navbar-link">Trips</Link>
                        <Link to="/SuperAdmin/finance" className="navbar-link">Finance</Link>
                        <Link to="/SuperAdmin/opsbook" className="navbar-link">Ops Book</Link>
                    </>
                )}
                {role === "hotel" && (
                    <>
                        <Link to="/Hotel/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/Hotel/bookings" className="navbar-link">Bookings</Link>
                        <Link to="/Hotel/earnings" className="navbar-link">Earnings</Link>
                        <Link to="/Hotel/reviews" className="navbar-link">Reviews</Link>
                        <Link to="/Hotel/services" className="navbar-link">Services</Link>
                    </>
                )}
                {role === "experience" && (
                    <>
                        <Link to="/Experience/dashboard" className="navbar-link">Dashboard</Link>
                        <Link to="/Experience/bookings" className="navbar-link">Bookings</Link>
                        <Link to="/Experience/earnings" className="navbar-link">Earnings</Link>
                        <Link to="/Experience/reviews" className="navbar-link">Reviews</Link>
                        <Link to="/Experience/experience" className="navbar-link">Experience</Link>
                        <Link to="/Experience/profile" className="navbar-link">Profile</Link>
                    </>
                )}
            </div>
        </nav>
    );
}