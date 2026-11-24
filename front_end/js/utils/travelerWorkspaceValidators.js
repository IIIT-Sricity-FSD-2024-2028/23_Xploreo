function isBlank(value) {
    return !String(value || "").trim();
}

export function validateTripPlan(payload) {
    const errors = {};

    if (isBlank(payload.origin)) {
        errors.origin = "Origin city is required.";
    }

    if (isBlank(payload.destination)) {
        errors.destination = "Destination city is required.";
    }

    if (!payload.departure) {
        errors.departure = "Departure date is required.";
    } else if (new Date(payload.departure).toString() === "Invalid Date") {
        errors.departure = "Enter a valid departure date.";
    }

    if (!payload.duration || Number(payload.duration) <= 0) {
        errors.duration = "Duration must be at least 1 day.";
    }

    if (payload.budget === "" || Number(payload.budget) <= 0) {
        errors.budget = "Budget must be greater than 0.";
    }

    if (payload.notes && payload.notes.trim().length > 240) {
        errors.notes = "Notes should stay under 240 characters.";
    }

    if (payload.origin && payload.destination && payload.origin.trim().toLowerCase() === payload.destination.trim().toLowerCase()) {
        errors.destination = "Destination should be different from the origin.";
    }

    return errors;
}

export function validateBookingUpdate(payload) {
    const errors = {};

    if (!payload.startDate) {
        errors.startDate = "Start date is required.";
    }

    if (!payload.endDate) {
        errors.endDate = "End date is required.";
    }

    if (payload.startDate && payload.endDate && new Date(payload.endDate) <= new Date(payload.startDate)) {
        errors.endDate = "End date must be after start date.";
    }

    if (!payload.travellers || Number(payload.travellers) < 1) {
        errors.travellers = "At least one traveller is required.";
    }

    if (!payload.status) {
        errors.status = "Choose a booking status.";
    }

    return errors;
}

export function validateProfile(payload) {
    const errors = {};

    if (isBlank(payload.fullName)) {
        errors.fullName = "Full name is required.";
    }

    if (isBlank(payload.email)) {
        errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        errors.email = "Enter a valid email address.";
    }

    if (isBlank(payload.phone)) {
        errors.phone = "Phone number is required.";
    } else {
        const normalizedPhone = String(payload.phone).replace(/\D/g, "");
        if (!/^[+\d][\d\s-]{7,}$/.test(payload.phone) || /^0+$/.test(normalizedPhone)) {
            errors.phone = "Enter a valid phone number.";
        }
    }

    if (isBlank(payload.location)) {
        errors.location = "Home location is required.";
    }

    if (isBlank(payload.bio)) {
        errors.bio = "Tell other travellers a little about yourself.";
    } else if (payload.bio.trim().length < 20) {
        errors.bio = "Bio should be at least 20 characters.";
    }

    return errors;
}
