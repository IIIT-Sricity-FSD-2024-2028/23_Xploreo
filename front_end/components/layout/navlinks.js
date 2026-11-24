const navlinks = [
  {
    name: "Dashboard",
    path: "../techadmin/tech_tickets.html",
    icon: "../../components/ui/dashboard.svg",
    roles: ["techadmin"]
  },
  {
    name: "Tickets",
    path: "../techadmin/tech_tickets.html",
    icon: "../../components/ui/support.svg",
    roles: ["techadmin"]
  },
  {
    name: "Activity",
    path: "../techadmin/tech_activity.html",
    icon: "../../components/ui/users.png",
    roles: ["techadmin"]
  },
  {
    name: "System Logs",
    path: "../techadmin/tech_logs.html",
    icon: "../../components/ui/operations.png",
    roles: ["techadmin"]
  },
  {
    name: "Profile",
    path: "../mainpages/profile.html",
    icon: "../../components/ui/user.svg",
    roles: ["techadmin"]
  },
  {
    name: "Dashboard",
    path: "../guide/dashboard.html",
    icon: "../../components/ui/dashboard.svg",
    roles: ["guide"]
  },
  {
    name: "Dashboard",
    path: "../superadmin/users.html",
    icon: "../../components/ui/dashboard.svg",
    roles: ["superadmin"]
  },
  {
    name: "Dashboard",
    path: "../guide/dashboard.html",
    icon: "../../components/ui/dashboard.svg",
    roles: ["hotel"]
  },
  {
    name: "Dashboard",
    path: "../nontechadmin/nta_dashboard.html",
    icon: "../../components/ui/dashboard.svg",
    roles: ["nontechadmin"]
  },
  {
    name: "Travel Packages",
    path: "../nontechadmin/nta_plans.html",
    icon: "../../components/ui/operations.png",
    roles: ["nontechadmin"]
  },
  {
    name: "Guides",
    path: "../misleous/guide.html",
    icon: "../../components/ui/users.png",
    roles: ["superadmin", "nontechadmin"]
  },
  {
    name: "Plans",
    path: "../misleous/plans.html",
    icon: "../../components/ui/operations.png",
    roles: ["superadmin", "nontechadmin"]
  },
  {
    name: "Trips",
    path: "../misleous/trips.html",
    icon: "../../components/ui/tours.svg",
    roles: ["superadmin", "nontechadmin"]
  },
  {
    name: "Operations & Bookings",
    path: "../superadmin/opsbook.html",
    icon: "../../components/ui/operations.png",
    roles: ["superadmin"]
  },
  {
    name: "Users & Partners",
    path: "../superadmin/users.html",
    icon: "../../components/ui/users.png",
    roles: ["superadmin"]
  },
  {
    name: "Finance & Reports",
    path: "../superadmin/finance.html",
    icon: "../../components/ui/finance.png",
    roles: ["superadmin"]
  },
  {
    name: "Tours",
    path: "../misleous/tours.html",
    icon: "../../components/ui/tours.svg",
    roles: ["guide"]
  },
  {
    name: "Schedule",
    path: "../guide/schedule.html",
    icon: "../../components/ui/schedule.svg",
    roles: ["guide"]
  },
  {
    name: "Earnings",
    path: "../guide/earnings.html",
    icon: "../../components/ui/earnings.svg",
    roles: ["guide"]
  },
  {
    name: "Reviews",
    path: "../guide/reviews.html",
    icon: "../../components/ui/reviews.svg",
    roles: ["guide"]
  },
  {
    name: "Bookings",
    path: "../hotels/hotelBookings.html",
    icon: "../../components/ui/operations.png",
    roles: ["hotel"]
  },
  {
    name: "Services",
    path: "../hotels/hotelRooms.html",
    icon: "../../components/ui/tours.svg",
    roles: ["hotel"]
  },
  {
    name: "Earnings",
    path: "../hotels/hotelEarning.html",
    icon: "../../components/ui/earnings.svg",
    roles: ["hotel"]
  },
  {
    name: "Home",
    path: "../experiences/experience_home.html",
    icon: "../../components/ui/dashboard.svg",
    roles: ["experience"]
  },
  {
    name: "Bookings",
    path: "../experiences/experience_bookings.html",
    icon: "../../components/ui/operations.png",
    roles: ["experience"]
  },
  {
    name: "Experiences",
    path: "../experiences/experience_experience.html",
    icon: "../../components/ui/tours.svg",
    roles: ["experience"]
  },
  {
    name: "Earnings",
    path: "../experiences/experience_earnings.html",
    icon: "../../components/ui/earnings.svg",
    roles: ["experience"]
  },

  
  {
    name: "Explore",
    path: "../traveller/traveller_dashboard.html",
    icon: "../../components/ui/exploreIcon.jpg",
    roles: ["traveller"]
  },
  
   
  {
    name: "Wish List",
    path: "../traveller/traveller_wishlist.html",
    icon: "../../components/ui/wishlistIcon.jpg",
    roles: ["traveller"]
  },

  {
    name: "My Trips",
    path: "../traveller/traveller_mytrips.html",
    icon: "../../components/ui/mytripsIcon.jpg",
    roles: ["traveller"]
  }
];

export function getNavLinks(role){
  const currentPage = window.location.pathname.split("/").pop();

  return navlinks
    .filter(link => link.roles.includes(role))
    .map(link => {
      const pageName = link.path.split("/").pop();
      return `
        <a href="${link.path}" class="nav-link ${currentPage === pageName ? "active" : ""}">
          <img src="${link.icon}" class="nav-icon" />
          ${link.name}
        </a>
      `;
    })
    .join("");
}
