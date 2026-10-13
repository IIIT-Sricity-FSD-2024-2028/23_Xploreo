export const sampleBooking = {
  id: 'bk-kerala-2026-001',
  travellerId: 'trav-usr-20001',
  guestName: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '9876543210',
  date: '2026-11-15T09:00:00.000Z',
  participants: 2,
  totalAmount: 18500,
  status: 'CONFIRMED',
  createdAt: '2026-10-10T14:30:00.000Z',
  experience: {
    id: 101,
    title: 'Alleppey Backwaters Luxury Houseboat Cruise',
    destination: 'Alleppey, Kerala',
    duration: '2 Days / 1 Night',
    pricePerPerson: 9250,
  },
};

export const sampleBookingsList = [
  sampleBooking,
  {
    id: 'bk-jaipur-2026-002',
    travellerId: 'trav-usr-20001',
    guestName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    date: '2026-12-05T08:00:00.000Z',
    participants: 1,
    totalAmount: 12000,
    status: 'CONFIRMED',
    createdAt: '2026-10-11T10:15:00.000Z',
    experience: {
      id: 102,
      title: 'Amber Fort Heritage Walking Tour with Expert Guide',
      destination: 'Jaipur, Rajasthan',
      duration: 'Full Day',
      pricePerPerson: 12000,
    },
  },
  {
    id: 'bk-goa-2026-003',
    travellerId: 'trav-usr-20001',
    guestName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    date: '2026-09-20T11:00:00.000Z',
    participants: 4,
    totalAmount: 32000,
    status: 'CANCELLED',
    createdAt: '2026-09-01T16:00:00.000Z',
    experience: {
      id: 103,
      title: 'South Goa Sunset Sailing & Coastal Discovery',
      destination: 'Goa',
      duration: '4 Hours',
      pricePerPerson: 8000,
    },
  },
];

export const sampleTrip = {
  id: 'trip-kerala-exp-01',
  travellerId: 'trav-usr-20001',
  planId: 'plan-south-india-01',
  guideId: '10001',
  status: 'started',
  totalAmount: 48500,
  currentDay: 2,
  currentStop: 'Vembanad Lake Kayaking Stop',
  currentLocation: 'Kumarakom, Kerala',
  trackingStatus: 'ongoing',
  progressPercentage: 45,
  lastUpdatedAt: '2026-10-12T16:45:00.000Z',
  itinerary: {
    day1: {
      hotel: { name: 'Kumarakom Lake Resort' },
      transport: {
        provider: 'Kerala Chauffeur Express',
        pickupLocation: 'Cochin International Airport (COK)',
        dropoffLocation: 'Resort Lobby',
      },
    },
    days: [
      {
        dayNumber: 1,
        experiences: [
          {
            experienceId: 'exp-101',
            title: 'Welcome Dinner & Traditional Kathakali Performance',
          },
        ],
      },
      {
        dayNumber: 2,
        experiences: [
          {
            experienceId: 'exp-102',
            title: 'Morning Bird Sanctuary Walk',
          },
          {
            experienceId: 'exp-103',
            title: 'Vembanad Lake Kayaking Stop',
          },
        ],
      },
      {
        dayNumber: 3,
        experiences: [
          {
            experienceId: 'exp-104',
            title: 'Spice Plantation Excursion & Tea Tasting',
          },
        ],
      },
    ],
  },
};

export const sampleTripsList = [
  sampleTrip,
  {
    id: 'trip-rajasthan-02',
    travellerId: 'trav-usr-20001',
    planId: 'plan-golden-triangle-02',
    guideId: '10002',
    status: 'confirmed',
    totalAmount: 64000,
    currentDay: 1,
    currentStop: 'Not yet started',
    currentLocation: 'Jaipur',
    trackingStatus: 'not_started',
    progressPercentage: 0,
    lastUpdatedAt: '2026-10-12T08:00:00.000Z',
    itinerary: {
      day1: {
        hotel: { name: 'Jai Mahal Palace' },
        transport: {
          provider: 'Royal Rajasthan Tours',
          pickupLocation: 'Jaipur Railway Station',
          dropoffLocation: 'Jai Mahal Palace',
        },
      },
      days: [
        {
          dayNumber: 1,
          experiences: [
            {
              experienceId: 'exp-201',
              title: 'City Palace & Jantar Mantar Walking Tour',
            },
          ],
        },
      ],
    },
  },
];

export const sampleReviewsList = [
  {
    id: 1,
    userId: 20001,
    targetType: 'guide',
    targetId: 10001,
    rating: 5,
    comment:
      'Friendly guide and a very well planned city walk. He knew all the quiet back alleys of Fort Kochi and shared fascinating history.',
    createdAt: '2026-10-12T08:30:00.000Z',
  },
  {
    id: 2,
    userId: 20002,
    targetType: 'hotel',
    targetId: 30001,
    rating: 4,
    comment:
      'Clean rooms, tranquil backwater view, and excellent room service. Breakfast spread had delicious traditional appams.',
    createdAt: '2026-10-11T12:00:00.000Z',
  },
  {
    id: 3,
    userId: 20001,
    targetType: 'experience',
    targetId: 40001,
    rating: 5,
    comment:
      'Breathtaking sunrise kayaking experience through narrow village canals. Highly recommend this for morning lovers!',
    createdAt: '2026-10-10T14:00:00.000Z',
  },
];
