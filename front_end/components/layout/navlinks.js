const navlinks = [
  {
    name: "Dashboard",
    path: "../pages/dashboard.html",
    icon: "../components/ui/dashboard.svg",
    roles: ["techadmin", "TECH_ADMIN"]
  },
  {
    name: "Tickets",
    path: "../pages/tech_tickets.html",
    icon: "../components/ui/support.svg",
    roles: ["techadmin", "TECH_ADMIN"]
  },
  {
    name: "Dashboard",
    path: "../pages/dashboard.html",
    icon: "../components/ui/dashboard.svg",
    roles: ["guide","superadmin","opadmin","hotel"]
  },
  {
    name: "Dashboard",
    path: "../pages/nta_dashboard.html",
    icon: "../components/ui/dashboard.svg",
    roles: ["nontechadmin"]
  },
  {
    name: "Travel Packages",
    path: "../pages/nta_plans.html",
    icon: "../components/ui/operations.png",
    roles: ["nontechadmin"]
  },
  {
    name: "Guide Applications",
    path: "../pages/nta_guide_applications.html",
    icon: "../components/ui/users.png",
    roles: ["nontechadmin"]
  },
  {
    name: "Guides",
    path: "../pages/guide.html",
    icon: "../components/ui/users.png",
    roles: ["superadmin", "nontechadmin"]
  },
  {
    name: "Plans",
    path: "../pages/plans.html",
    icon: "../components/ui/operations.png",
    roles: ["superadmin"]
  },
  {
    name: "Trips",
    path: "../pages/trips.html",
    icon: "../components/ui/tours.svg",
    roles: ["superadmin"]
  },
  {
    name: "Operations & Bookings",
    path: "../pages/opsbook.html",
    icon: "../components/ui/operations.png",
    roles: ["superadmin"]
  },
  {
    name: "Users & Partners",
    path: "../pages/users.html",
    icon: "../components/ui/users.png",
    roles: ["superadmin"]
  },
  {
    name: "Finance & Reports",
    path: "../pages/finance.html",
    icon: "../components/ui/finance.png",
    roles: ["superadmin"]
  },

  {
    name: "Earnings",
    path: "../pages/earnings.html",
    icon: "../components/ui/earnings.svg",
    roles: ["guide"]
  },
  {
    name: "Reviews",
    path: "../pages/reviews.html",
    icon: "../components/ui/reviews.svg",
    roles: ["guide"]
  },
  {
    name: "Bookings",
    path: "../pages/hotelBookings.html",
    icon: "../components/ui/operations.png",
    roles: ["hotel"]
  },
  {
    name: "Services",
    path: "../pages/hotelRooms.html",
    icon: "../components/ui/tours.svg",
    roles: ["hotel"]
  },
  {
    name: "Earnings",
    path: "../pages/hotelEarning.html",
    icon: "../components/ui/earnings.svg",
    roles: ["hotel"]
  },
  {
    name: "Home",
    path: "../pages/experience_home.html",
    icon: "../components/ui/dashboard.svg",
    roles: ["experience"]
  },
  {
    name: "Bookings",
    path: "../pages/experience_bookings.html",
    icon: "../components/ui/operations.png",
    roles: ["experience"]
  },
  {
    name: "Experiences",
    path: "../pages/experience_experience.html",
    icon: "../components/ui/tours.svg",
    roles: ["experience"]
  },
  {
    name: "Earnings",
    path: "../pages/experience_earnings.html",
    icon: "../components/ui/earnings.svg",
    roles: ["experience"]
  },

  
  {
    name: "Explore",
    path: "../pages/traveller_dashboard.html",
    icon: "../components/ui/exploreIcon.jpg",
    roles: ["traveller"]
  },
  
   
  {
    name: "Wish List",
    path: "../pages/traveller_wishlist.html",
    icon: "../components/ui/wishlistIcon.jpg",
    roles: ["traveller"]
  },

  {
    name: "My Trips",
    path: "../pages/traveller_mytrips.html",
    icon: "../components/ui/mytripsIcon.jpg",
    roles: ["traveller"]
  }
];

export function getNavLinks(role){
  const currentPage = window.location.pathname.split("/").pop();
  const normalizedRole = (role || "").toLowerCase().replace(/_/g, "");

  return navlinks
    .filter(link => link.roles.some(r => r.toLowerCase().replace(/_/g, "") === normalizedRole))
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
