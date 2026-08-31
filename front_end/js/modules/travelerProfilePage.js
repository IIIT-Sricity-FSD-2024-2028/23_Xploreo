import {
    ensureTravelerSession,
    getTravelerBookings,
    getTravelerPlans,
    getTravelerProfile,
    saveTravelerProfile,
    seedTravelerWorkspace
} from "../utils/travelerWorkspaceState.js";
import { validateProfile } from "../utils/travelerWorkspaceValidators.js";
import {
    createEmptyState,
    renderFieldError,
    showWorkspaceToast
} from "./travelerWorkspaceUI.js";
import { fetchTravellerProfile, updateTravellerProfile, createTravellerProfile } from "../api/services.js";

export async function initTravelerProfilePage(containerId) {
    const container = document.getElementById(containerId);
    const user = ensureTravelerSession();

    if (!container) {
        return;
    }

    seedTravelerWorkspace();

    // Try to load from backend and update local state
    try {
        const backendProfile = await fetchTravellerProfile(user.id);
        if (backendProfile) {
            const currentLocal = getTravelerProfile();
            const fullName = `${backendProfile.fname || ''} ${backendProfile.lname || ''}`.trim() || currentLocal.fullName;
            const merged = { 
                ...currentLocal, 
                ...backendProfile, 
                fullName: fullName,
                phone: backendProfile.phno ? String(backendProfile.phno) : currentLocal.phone
            };
            if (backendProfile.dob) {
                try {
                    merged.dob = new Date(backendProfile.dob).toISOString().split('T')[0];
                } catch (e) {
                    merged.dob = currentLocal.dob;
                }
            }
            saveTravelerProfile(merged);
        }
    } catch (e) {
        console.log("Could not load backend traveler profile, falling back to local.", e);
    }

    const state = {
        editing: false,
        errors: {}
    };

    function getNameParts(fullName) {
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        return {
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || ""
        };
    }

    function render() {
        const profile = getTravelerProfile();
        const initials = profile.fullName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "TR";
        const { firstName, lastName } = getNameParts(profile.fullName);

        container.innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <h1 class="profile-title">Traveller profile</h1>
                    <p class="profile-subtitle">Your traveller details in a simple, clean layout.</p>
                </div>

                <div class="profile-hero-card">
                    <div class="profile-avatar-wrapper" style="width:120px;height:120px;">
                        <div class="profile-avatar" style="display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:#0F172A;background:#E2E8F0;border-radius:50%;border:4px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.08);">${initials}</div>
                    </div>
                    <div class="hero-info">
                        <h2 class="hero-name">${profile.fullName}</h2>
                        <div class="hero-meta" style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem;color:var(--text-muted);font-size:0.95rem;">
                            <div>${profile.email}</div>
                            <div>${profile.phone}</div>
                        </div>
                    </div>
                </div>

                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Profile details</h3>
                        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                            <button type="button" class="edit-btn" id="toggle-profile-edit">${state.editing ? "Close editor" : "Edit profile"}</button>
                        </div>
                    </div>
                    ${state.editing ? renderEditForm(profile) : renderProfileReadOnly(profile)}
                </div>

                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Preferences</h3>
                    </div>
                    <div class="lang-list" style="display:flex;flex-wrap:wrap;gap:0.75rem;">
                        ${profile.hobbies.map((hobby) => `<span class="lang-tag">${hobby}</span>`).join("")}
                    </div>
                    <div style="margin-top:1.5rem;">
                        <span class="label">Bio</span>
                        <p style="margin:0.75rem 0 0 0; line-height:1.75; color:#4B5563;">${profile.bio}</p>
                    </div>
                </div>
            </div>
        `;

        bindEvents();
    }

    function renderProfileReadOnly(profile) {
        const { firstName, lastName } = getNameParts(profile.fullName);
        return `
            <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:1.5rem;">
                <div class="input-group">
                    <span class="label">First Name</span>
                    <input class="input-field" value="${firstName}" disabled>
                </div>
                <div class="input-group">
                    <span class="label">Last Name</span>
                    <input class="input-field" value="${lastName}" disabled>
                </div>
                <div class="input-group full">
                    <span class="label">Email Address</span>
                    <input class="input-field" value="${profile.email}" disabled>
                </div>
                <div class="input-group full">
                    <span class="label">Phone Number</span>
                    <input class="input-field" value="${profile.phone}" disabled>
                </div>
                <div class="input-group">
                    <span class="label">Gender</span>
                    <input class="input-field" value="${profile.gender || 'Not provided'}" disabled>
                </div>
                <div class="input-group">
                    <span class="label">Date of Birth</span>
                    <input class="input-field" value="${profile.dob || 'Not provided'}" disabled>
                </div>
                <div class="input-group full">
                    <span class="label">Preferred language</span>
                    <input class="input-field" value="${profile.language}" disabled>
                </div>
            </div>
        `;
    }

    function renderEditForm(profile) {
        const { firstName, lastName } = getNameParts(profile.fullName);
        return `
            <form id="profile-edit-form" class="profile-section" novalidate style="padding:0; border:none; box-shadow:none;">
                <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:1.5rem;">
                    <div class="input-group">
                        <span class="label">First Name</span>
                        <input type="text" name="firstName" class="input-field" value="${firstName}">
                    </div>
                    <div class="input-group">
                        <span class="label">Last Name</span>
                        <input type="text" name="lastName" class="input-field" value="${lastName}">
                    </div>
                    <div class="input-group full">
                        <span class="label">Email Address</span>
                        <input type="email" name="email" class="input-field" value="${profile.email}">
                    </div>
                    <div class="input-group full">
                        <span class="label">Phone Number</span>
                        <input type="text" name="phone" class="input-field" value="${profile.phone}">
                    </div>
                    <div class="input-group">
                        <span class="label">Gender</span>
                        <select name="gender" class="input-field">
                            <option value="">Select</option>
                            <option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
                            <option value="Other" ${profile.gender === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <span class="label">Date of Birth</span>
                        <input type="date" name="dob" class="input-field" value="${profile.dob || ''}">
                    </div>
                    <div class="input-group full">
                        <span class="label">Preferred language</span>
                        <input type="text" name="language" class="input-field" value="${profile.language}">
                    </div>
                    <div class="input-group full">
                        <span class="label">Preferences</span>
                        <select name="interestPreferences" class="input-field" multiple size="5" style="min-height: 150px;">
                            ${["Adventure","Culture","Food","Nature","History"].map((option) => `
                                <option value="${option}" ${((profile.interestPreferences || []).includes(option)) ? 'selected' : ''}>${option}</option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="input-group full">
                        <span class="label">Hobbies / Interests</span>
                        <input type="text" name="hobbies" class="input-field" value="${profile.hobbies.join(', ')}">
                    </div>
                    <div class="input-group full">
                        <span class="label">Bio</span>
                        <textarea name="bio" class="input-field" rows="5">${profile.bio}</textarea>
                    </div>
                </div>
                <div class="save-all-container" style="margin-top:1.5rem;">
                    <button type="button" class="secondary-btn" id="cancel-profile-edit">Cancel</button>
                    <button type="submit" class="primary-btn">Save profile</button>
                </div>
            </form>
        `;
    }

    function bindEvents() {
        container.querySelector("#toggle-profile-edit")?.addEventListener("click", () => {
            state.editing = !state.editing;
            state.errors = {};
            render();
        });

        container.querySelector("#cancel-profile-edit")?.addEventListener("click", () => {
            state.editing = false;
            state.errors = {};
            render();
        });

        container.querySelector("#profile-edit-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const profile = getTravelerProfile();
            const firstName = form.elements.firstName.value.trim();
            const lastName = form.elements.lastName.value.trim();
            const hobbiesRaw = form.elements.hobbies.value.split(",").map((h) => h.trim()).filter(Boolean);
            const preferenceOptions = Array.from(form.elements.interestPreferences.selectedOptions || []).map((option) => option.value);
            
            const dob = form.elements.dob?.value;
            const gender = form.elements.gender?.value;

            const payload = {
                ...profile,
                fullName: `${firstName} ${lastName}`.trim(),
                name: `${firstName} ${lastName}`.trim(),
                email: form.elements.email.value.trim(),
                phone: form.elements.phone.value.trim(),
                phno: form.elements.phone.value.trim(),
                language: form.elements.language.value.trim(),
                bio: form.elements.bio.value.trim(),
                hobbies: hobbiesRaw,
                interestPreferences: preferenceOptions,
                dob: dob,
                gender: gender
            };

            const errors = validateProfile(payload);
            state.errors = errors;

            if (Object.keys(errors).length) {
                showWorkspaceToast("Please correct the profile form.", "error");
                render();
                return;
            }

            try {
                // Save to backend
                const backendPayload = {
                    fname: firstName,
                    lname: lastName,
                    email: payload.email,
                    phno: Number(String(payload.phone).replace(/\D/g, '')) || 0,
                    gender: payload.gender || "Other",
                    dob: payload.dob ? new Date(payload.dob).toISOString() : undefined
                };
                
                try {
                    await updateTravellerProfile(user.id, backendPayload);
                } catch (e) {
                    if (e.status === 404 || e.message?.includes("not found")) {
                        await createTravellerProfile(backendPayload);
                    } else {
                        throw e;
                    }
                }
            } catch (err) {
                console.warn("Failed to save profile to backend", err);
                showWorkspaceToast("Saved locally, but failed to sync to server.", "warning");
            }

            saveTravelerProfile(payload);
            state.editing = false;
            state.errors = {};
            showWorkspaceToast("Profile updated.");
            render();
        });
    }

    render();
}
