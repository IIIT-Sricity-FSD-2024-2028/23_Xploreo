const TRAVELER_PAGES_PATH = "./";
const LOGIN_PATH = "../login.html";
const PROFILE_PATH = "./traveller_profile.html";
const SUPPORT_PATH = "./traveller_support.html";
const LOGO_PATH = "../../components/ui/landing/navbar-logo.png";

export function renderTravelerNavbar() {
    let user = JSON.parse(localStorage.getItem("currentUser"));
    
    // Fallback if accessed directly without login
    if (!user) {
        user = {
            name: "John Doe",
            username: "johndoe",
            profilePic: "../components/ui/landing/traveler.png" 
        };
    }

    const firstChar = user.name ? user.name.charAt(0).toUpperCase() : "U";

    const navbarHTML = `
        <header class="top-bar">
            <div class="nav-left">
                <img src="${LOGO_PATH}" class="logo" id="home-logo" style="cursor:pointer" alt="Xploreo Logo">
                <span class="brand">Xploreo</span>
            </div>
            
            <nav class="nav-links">
                <a href="${TRAVELER_PAGES_PATH}dashboard.html">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                   Explore
                </a>
                <a href="${TRAVELER_PAGES_PATH}wishlist.html">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                   Wishlist
                </a>
                <a href="${TRAVELER_PAGES_PATH}mytrips.html">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                   My Trips
                </a>
            </nav>
            
            <div class="nav-right">
                <div class="user-greeting">
                    <span>Hello, ${user.name.split(' ')[0]} 👋</span>
                </div>
                <div class="user-avatar" id="profile-dropdown-btn">
                     ${user.profilePic && user.profilePic !== "" ? `<img src="${user.profilePic}" alt="User Avatar">` : `<div class="avatar-initial">${firstChar}</div>`}
                </div>
                
                <div class="profile-dropdown hidden" id="profile-dropdown-menu">
                    <div class="dropdown-header">
                        <p class="dropdown-name">${user.name}</p>
                        <p class="dropdown-email">${user.email || user.username}</p>
                    </div>
                    <hr>
                    <a href="${PROFILE_PATH}">Manage Profile</a>
                    <a href="${SUPPORT_PATH}">Support</a>
                    <hr>
                    <a href="#" id="logout-btn" class="logout-text">Log Out</a>
                </div>
            </div>
        </header>
    `;

    document.body.insertAdjacentHTML("afterbegin", navbarHTML);
    attachNavbarEvents();
}

function attachNavbarEvents() {
    // Dynamic Active Link State
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (currentPath === linkPath) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
    const logo = document.getElementById("home-logo");
    const profileBtn = document.getElementById("profile-dropdown-btn");
    const dropdown = document.getElementById("profile-dropdown-menu");
    const logoutBtn = document.getElementById("logout-btn");

    if (logo) {
        logo.addEventListener("click", () => {
            window.location.href = `${TRAVELER_PAGES_PATH}dashboard.html`;
        });
    }

    if (profileBtn && dropdown) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("hidden");
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add("hidden");
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("currentUser");
            window.location.href = LOGIN_PATH;
        });
    }
}
