export function mapHotelToSearchCard(hotel) {
    return {
        id: hotel.id,
        city: hotel.city,
        title: hotel.name,
        area: hotel.location,
        distance: "Central access",
        category: `${hotel.stars}-Star Stay`,
        categoryCount: hotel.stars,
        image: hotel.image,
        categoryImage: hotel.image,
        rating: Number(hotel.rating),
        reviews: hotel.reviewCount,
        description: hotel.description,
        tags: hotel.amenities || [],
        oldPrice: Math.round(Number(hotel.pricePerNight) * 1.18),
        offer: "Flexible cancellation",
        price: Number(hotel.pricePerNight),
        taxes: Number(hotel.taxesAndFees || 0),
        stars: Number(hotel.stars),
        maxGuests: 4,
        promoted: Number(hotel.rating) >= 4.7,
        totalRooms: hotel.totalRooms || 10,
        availableRooms: hotel.availableRooms ?? hotel.totalRooms ?? 10
    };
}

export function mapExperienceToSearchCard(experience) {
    return {
        id: experience.id,
        title: experience.title,
        description: experience.description || experience.title,
        price: Number(experience.price),
        duration: `${experience.durationHours} hours`,
        capacity: Number(experience.capacity),
        status: experience.availability === "available" ? "active" : "inactive",
        image: experience.image,
        nextSlot: experience.nextSlot,
        booked: Number(experience.booked),
        destination: experience.destination,
        category: capitalizeWords(experience.category),
        slots: Array.isArray(experience.slots) ? experience.slots : []
    };
}

export function mapPlanToPackage(plan, searchValues = {}) {
    const guestCount = clampCount(searchValues.guestCount || 2, 1, 8);
    const nights = Number(plan.durationNights || 1);

    return {
        id: plan.id,
        origin: plan.originCity,
        destination: plan.destination,
        title: plan.title,
        image: plan.image,
        nights,
        days: nights + 1,
        hotelCategory: Number(plan.hotelStars || 4),
        withFlight: Boolean(plan.includesFlight),
        pricePerPerson: Number(plan.pricePerPerson),
        stayLine: `${nights} nights in a ${plan.hotelStars}★ stay`,
        mealsLine: "Breakfast included daily",
        transferLine: plan.includesFlight ? "Airport & hotel transfers included" : "Hotel transfers included",
        activityLine: plan.tags?.length ? `${plan.tags.join(" · ")} experiences` : "Guided local experiences",
        perk: "Flexible itinerary with live trip support",
        emi: Math.max(99, Math.round(Number(plan.pricePerPerson) / 6)),
        totalPriceDisplay: Number(plan.pricePerPerson) * guestCount,
        budgetBucket:
            Number(plan.pricePerPerson) < 500 ? "under-500" :
            Number(plan.pricePerPerson) <= 1000 ? "500-1000" :
            Number(plan.pricePerPerson) <= 2000 ? "1000-2000" :
            "above-2000",
        departureDate: searchValues.departureDate || "",
        tags: plan.tags || [],
        itinerary: plan.itinerary || []
    };
}

export function mapTripToLegacyTour(trip, currentUserRole = "traveller") {
    return {
        id: trip.id,
        planId: trip.planId,
        guideId: trip.guideId,
        customerId: trip.travellerId,
        customer: "Traveler",
        email: "",
        phone: "",
        title: trip.title,
        destination: trip.destination,
        location: trip.location,
        plan_iternary: (trip.itinerary || []).map((item) => item.title),
        currentloction: trip.currentLocation || null,
        dateTime: `${trip.startDate} | 09:00 AM`,
        status: trip.status,
        guests: Number(trip.guests || 1),
        amount: Number(trip.amount || 0),
        duration: trip.durationLabel,
        itinerary: trip.itinerary || [],
        paymentBreakdown: trip.paymentBreakdown || { flights: 0, stay: 0, activities: 0, guide: 0 },
        documents: trip.documents || [],
        type: trip.type,
        roleView: currentUserRole
    };
}

function clampCount(value, min, max) {
    const parsed = Number.parseInt(String(value || min), 10);
    if (Number.isNaN(parsed)) return min;
    return Math.min(max, Math.max(min, parsed));
}

function capitalizeWords(value) {
    return String(value || "")
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
