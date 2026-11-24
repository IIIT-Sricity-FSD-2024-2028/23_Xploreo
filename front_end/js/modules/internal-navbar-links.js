const internalnavlinks = [
  {
    name: "Upcoming",
    status: "pending", 
    pages: ["tours.html"],
  },
  {
    name: "Ongoing",
    status: "ongoing",
    pages: ["tours.html"],
  },
  {
    name: "Completed",
    status: "completed",
    pages: ["tours.html"],
  },
  {
    name: "Overview",
    status: "overview",
    pages: ["earnings.html"],
  },
  {
    name: "Payout History",
    status: "payout-history",
    pages: ["earnings.html"],
  },
  {
    name: "Calendar",
    status: "calendar",
    pages: ["schedule.html"],
  },
  {
    name: "Availability",
    status: "availability",
    pages: ["schedule.html"],
  }
];

export function getNavLinks(page) {
  return internalnavlinks.filter(link => link.pages.includes(page)); 
}