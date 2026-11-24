export function getProfile(user) {
    // 1. Route the user to the correct profile page based on their role
    let profileLink = 'profile.html'; // Default fallback
    let supportLink = 'support.html';
    
    // Compute base path: pages are 2 levels deep (pages/subfolder/page.html)
    // so we need to go up 2 levels to reach front_end root, then navigate to target
    const basePath = window.location.pathname.match(/\/pages\/[^/]+\//)
        ? "../../pages/"
        : "../pages/";

    if (user) {
        if (user.role === 'traveller') {
            profileLink = basePath + 'traveller/traveller_profile.html';
            supportLink = basePath + 'traveller/traveller_support.html';
        } else if (user.role === 'hotel') {
            profileLink = basePath + 'hotels/hotelprofile.html';
        } else if (user.role === 'superadmin') {
            profileLink = basePath + 'superadmin/adminProfile.html';
        } else if (user.role === 'guide') {
            profileLink = basePath + 'mainpages/profile.html';
            supportLink = basePath + 'mainpages/support.html';
        } else if (user.role === 'experience') {
            profileLink = basePath + 'mainpages/profile.html';
            supportLink = basePath + 'mainpages/support.html';
        } else if (user.role === 'techadmin' || user.role === 'nontechadmin') {
            profileLink = basePath + 'mainpages/profile.html';
        }
    }

    // 2. Hide Support specifically for techadmin, superadmin, and nontechadmin
    const supportItem = (user && user.role !== 'techadmin' && user.role !== 'superadmin' && user.role !== 'nontechadmin') ? `
              <div class="dropdown-item" onclick="window.location.href='${supportLink}'">
                <img src="../../components/ui/support.svg" class="dropdown-icon">
                <span>Support</span>
              </div>
    ` : '';

    // 3. Render the dropdown (Profile is now back for everyone)
    return `
        <div class="profile" onclick="toggleProfileMenu()">
            <span class="profile-name">${user ? user.name : 'User'}</span>
            <img src="../../components/ui/profile.png" alt="user" class="profile-img"/>
            <div class="profile-dropdown hidden" id="profile-dropdown">
              
              <div class="dropdown-item" onclick="window.location.href='${profileLink}'">
                <img src="../../components/ui/user.svg" class="dropdown-icon">
                <span>Profile</span>
              </div>
              
              ${supportItem}
              
              <hr class="dropdown-divider">
              <div class="dropdown-item logout-item" onclick="logout()">
                <img src="../../components/ui/logout.svg" class="dropdown-icon">
                <span>Logout</span>
              </div>
            </div>
        </div>`;
}

// Handle opening/closing the dropdown
window.addEventListener("click", function (e) {
    const profile = document.querySelector(".profile");
    const dropdown = document.querySelector(".profile-dropdown");

    if (!profile || !dropdown) return;

    if (profile.contains(e.target)) {
        dropdown.classList.toggle("hidden");
    } else {
        dropdown.classList.add("hidden");
    }
});

// Handle Logout
window.logout = function () {
  localStorage.removeItem("currentUser");
  const depth = (window.location.pathname.match(/\/pages\/[^/]+\//) ? 2 : window.location.pathname.includes("/pages/") ? 1 : 0);
  if (depth === 2) {
    window.location.href = "../../pages/mainpages/login.html";
  } else if (depth === 1) {
    window.location.href = "../pages/mainpages/login.html";
  } else {
    window.location.href = "pages/mainpages/login.html";
  }
};

window.toggleProfileMenu = function() {
    const dropdown = document.getElementById("profile-dropdown");

    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}
