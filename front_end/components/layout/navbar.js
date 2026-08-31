import { getNavLinks } from "./navlinks.js";
import { getProfile } from "./profile.js";
import { getNotification } from "./notification.js";

export function renderNavbar(user) {
  console.log(user);
  console.log(user.role);
  console.log(getNavLinks(user.role));
  const navbar = `
    <nav class="navbar">
      <div class="navbar-left">
      <div class="logo">
       <img src="../components/ui/logo.png" alt="Xploreo Logo"> 
        <span>Xploreo</span>
      </div>
      
      </div>
      <div class="navbar-center">
        ${getNavLinks(user.role)}
      </div>
      <div class="navbar-right">
        ${getNotification()}
        ${getProfile(user)}
      </div>
    </nav>
  `;
  document.getElementById("navbar").innerHTML = navbar;
}