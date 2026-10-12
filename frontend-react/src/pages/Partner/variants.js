// One shared partner profile page (the old profile.html), a variant per partner type chosen from
// useAuth().user.partnerType. The two sections keep the old titles; what differs is the second one:
//   guide      -> "Professional Details" (years of experience, languages, bio), saved to /guide/:id
//   experience -> "Business Details" (business name), saved to the user record
// M3 adds the `hotel` entry here (agree the extra fields with M2 before changing the page).
export const partnerProfileVariants = {
  experience: { professional: false, businessLabel: 'Business Name' },
  guide: { professional: true, businessLabel: null },
};

export const fallbackVariant = { professional: false, businessLabel: null };
