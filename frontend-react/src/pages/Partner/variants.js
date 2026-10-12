// One shared partner profile page, three variants chosen by useAuth().user.partnerType.
// M3 adds the `hotel` entry here (agree the extra fields with M2 before changing the page).
export const partnerProfileVariants = {
  experience: {
    title: 'Experience partner profile',
    intro: 'How Xploreo and your guests see your business.',
    nameLabel: 'Contact name',
    businessLabel: 'Business name',
  },
  guide: {
    title: 'Guide profile',
    intro: 'Your details as shown to travellers you guide.',
    nameLabel: 'Full name',
    businessLabel: null,
  },
};

export const fallbackVariant = {
  title: 'Partner profile',
  intro: 'Your account details.',
  nameLabel: 'Name',
  businessLabel: null,
};
