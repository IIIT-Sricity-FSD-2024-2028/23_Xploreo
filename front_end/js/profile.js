import { fetchTickets, fetchGuide, updateGuideProfile, updateUser } from "./api/services.js";

let profileData = null;
let currentUser = null;

export async function renderProfilePage(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;

    currentUser = JSON.parse(localStorage.getItem("currentUser")) || user || {
        id: "admin-tech-01",
        name: "Technical Administrator",
        username: "techadmin",
        email: "techadmin@xploreo.com",
        phone: "9876543210",
        dob: "1995-01-15",
        gender: "Male",
        role: "techadmin"
    };

    const roleStr = (currentUser.role || "").toLowerCase().replace(/_/g, "");
    const isTechAdmin = roleStr === "techadmin";

    if (isTechAdmin) {
        await renderTechAdminProfile(container, currentUser);
        return;
    }

    await renderStandardProfile(container, currentUser);
}

/* =========================================================================
   TECHNICAL ADMIN PROFILE (Signup details Only & Dynamic Ticket Stats)
   ========================================================================= */
async function renderTechAdminProfile(container, user) {
    // Dynamic ticket calculation to match the Tech Admin Dashboard exactly
    let tickets = [];
    try {
        tickets = await fetchTickets();
    } catch (err) {
        console.warn("Using fallback tickets in tech profile:", err);
        const techData = JSON.parse(localStorage.getItem("techAdminData")) || { tickets: [] };
        tickets = techData.tickets || [];
    }

    const resolvedCount = tickets.filter(t => t && (t.status === 'RESOLVED' || t.status === 'resolved')).length;
    const pendingCount = tickets.filter(t => t && (t.status === 'OPEN' || t.status === 'pending' || t.status === 'in-progress')).length;

    // Split name into first and last name safely
    const nameParts = (user.name || "Technical Administrator").trim().split(" ");
    const firstName = nameParts[0] || "Technical";
    const lastName = nameParts.slice(1).join(" ") || "Admin";
    const username = user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : "techadmin");
    const email = user.email || "techadmin@xploreo.com";
    const phone = user.phone || user.phno || "9876543210";
    const dob = user.dob || "1995-01-15";
    const gender = user.gender || "Male";
    const profilePic = user.profilePic || "../components/ui/profile.png";

    container.innerHTML = `
        <div class="profile-page tech-admin-profile">
            <div class="profile-header">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h1 class="profile-title" style="margin: 0 0 6px; font-size: 28px; font-weight: 800; color: #111827;">Technical Admin Profile</h1>
                        <p class="profile-subtitle" style="margin: 0; color: #6B7280; font-size: 14px;">Manage your account details and personal information.</p>
                    </div>
                    <button type="button" class="secondary-btn" onclick="window.location.href='dashboard.html'" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px;">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>

            <!-- Profile Hero Card -->
            <div class="profile-hero-card" style="background: white; border-radius: 16px; padding: 24px 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #E5E7EB; margin-bottom: 24px;">
                <div class="profile-avatar-wrapper" style="position: relative; width: 100px; height: 100px; flex-shrink: 0;">
                    <img src="${profilePic}" class="profile-avatar" id="profilePic" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #2563EB; box-shadow: 0 4px 12px rgba(37,99,235,0.15);">
                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                    <div class="upload-btn" id="uploadBtn" title="Change Avatar" style="position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-radius: 50%; background: #2563EB; color: white; display: flex; align-items: center; justify-content: center; border: 2px solid white; cursor: pointer; transition: transform 0.2s;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                </div>

                <div class="hero-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <h2 class="hero-name" id="heroNameDisplay" style="margin: 0; font-size: 22px; font-weight: 700; color: #111827;">${escapeHtml(user.name || firstName + ' ' + lastName)}</h2>
                        <span style="font-size: 13px; color: #6B7280; font-family: monospace; background: #F3F4F6; padding: 2px 8px; border-radius: 6px;">@${escapeHtml(username)}</span>
                    </div>
                    <span class="hero-title" style="display: inline-block; color: #2563EB; font-weight: 600; font-size: 14px; margin: 4px 0 12px;">Technical Administrator</span>
                    
                    <div class="hero-meta" style="display: flex; gap: 20px; flex-wrap: wrap; color: #4B5563; font-size: 13px;">
                        <div class="meta-item" style="display: flex; align-items: center; gap: 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <span style="font-weight: 600; color: #111827;">${resolvedCount}</span> Resolved Tickets
                        </div>
                        <div class="meta-item" style="display: flex; align-items: center; gap: 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                            <span style="font-weight: 600; color: #111827;">${pendingCount}</span> In Queue
                        </div>
                    </div>
                </div>

                <div class="badges" style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                    <span class="badge verified" style="background: #DCFCE7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700;">Authorized</span>
                    <span class="badge" style="background: #EFF6FF; color: #1E40AF; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700;">Level 1 Access</span>
                </div>
            </div>

            <!-- Profile Form: Signup Details Only -->
            <form id="techAdminProfileForm">
                <div class="profile-section" style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #E5E7EB; margin-bottom: 24px;">
                    <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #F3F4F6; padding-bottom: 14px;">
                        <div>
                            <h3 class="section-title" style="margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #111827;">Personal Information</h3>
                            <span class="section-desc" style="font-size: 13px; color: #6B7280;">Basic account credentials configured during registration</span>
                        </div>
                        <button type="button" class="edit-btn" id="editPersonalBtn" style="padding: 6px 16px; border: 1px solid #D1D5DB; background: white; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #374151;">Edit</button>
                    </div>

                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
                        <div class="input-group">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">First Name</label>
                            <input type="text" class="input-field" name="firstName" id="techFirstName" value="${escapeHtml(firstName)}" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div class="input-group">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Last Name</label>
                            <input type="text" class="input-field" name="lastName" id="techLastName" value="${escapeHtml(lastName)}" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div class="input-group">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Username (6-20 alphabets)</label>
                            <input type="text" class="input-field" name="username" id="techUsername" value="${escapeHtml(username)}" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; font-family: monospace;">
                        </div>

                        <div class="input-group">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Email Address</label>
                            <input type="email" class="input-field" name="email" id="techEmail" value="${escapeHtml(email)}" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div class="input-group">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Phone Number</label>
                            <div style="display: flex; width: 100%;">
                                <span style="display: flex; align-items: center; justify-content: center; background: #F3F4F6; border: 1px solid #D1D5DB; border-right: none; border-radius: 8px 0 0 8px; padding: 0 12px; color: #6B7280; font-size: 13px; font-weight: 600;">+91</span>
                                <input type="tel" class="input-field" name="phone" id="techPhone" value="${escapeHtml(phone)}" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0 8px 8px 0; font-size: 14px;">
                            </div>
                        </div>

                        <div class="input-group">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Date of Birth</label>
                            <input type="date" class="input-field" name="dob" id="techDob" value="${escapeHtml(dob)}" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div class="input-group full" style="grid-column: span 2;">
                            <label class="label" style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Gender</label>
                            <select class="input-field" name="gender" id="techGender" disabled style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px;">
                                <option value="Male" ${gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${gender === 'Other' ? 'selected' : ''}>Other</option>
                                <option value="Prefer not to say" ${gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons Container -->
                <div class="save-all-container" style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 40px;">
                    <button type="button" class="secondary-btn" onclick="window.history.back()" style="padding: 10px 24px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer;">Cancel</button>
                    <button type="submit" class="primary-btn" style="padding: 10px 28px; background: #2563EB; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">Save Profile Changes</button>
                </div>
            </form>
        </div>
    `;

    setupTechAdminListeners(user);
}

function setupTechAdminListeners(user) {
    // 1. Profile Picture Upload & Preview
    const uploadBtn = document.getElementById("uploadBtn");
    const avatarInput = document.getElementById("avatarInput");
    if (uploadBtn && avatarInput) {
        uploadBtn.onclick = () => avatarInput.click();
        avatarInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const base64 = re.target.result;
                    document.getElementById("profilePic").src = base64;
                    user.profilePic = base64;
                    localStorage.setItem("currentUser", JSON.stringify(user));

                    // Update navbar avatar if present
                    const navAvatar = document.querySelector(".profile-img");
                    if (navAvatar) navAvatar.src = base64;

                    // Sync in users list
                    const users = JSON.parse(localStorage.getItem("users")) || [];
                    const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
                    if (idx !== -1) {
                        users[idx].profilePic = base64;
                        localStorage.setItem("users", JSON.stringify(users));
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // 2. Toggle Edit Mode for Personal Information
    const editBtn = document.getElementById("editPersonalBtn");
    if (editBtn) {
        editBtn.onclick = () => {
            const inputs = document.querySelectorAll("#techAdminProfileForm .profile-section input, #techAdminProfileForm .profile-section select");
            const isCurrentlyDisabled = inputs[0]?.disabled;

            inputs.forEach(inp => inp.disabled = !isCurrentlyDisabled);

            if (isCurrentlyDisabled) {
                editBtn.innerText = "Lock";
                editBtn.style.background = "#EFF6FF";
                editBtn.style.color = "#2563EB";
                editBtn.style.borderColor = "#93C5FD";
                if (inputs[0]) inputs[0].focus();
            } else {
                editBtn.innerText = "Edit";
                editBtn.style.background = "white";
                editBtn.style.color = "#374151";
                editBtn.style.borderColor = "#D1D5DB";
            }
        };
    }

    // 3. Global Form Submit (Save Changes)
    const form = document.getElementById("techAdminProfileForm");
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();

            const fName = (document.getElementById("techFirstName")?.value || "").trim();
            const lName = (document.getElementById("techLastName")?.value || "").trim();
            const uname = (document.getElementById("techUsername")?.value || "").trim();
            const email = (document.getElementById("techEmail")?.value || "").trim();
            const phone = (document.getElementById("techPhone")?.value || "").trim();
            const dob = (document.getElementById("techDob")?.value || "").trim();
            const gender = (document.getElementById("techGender")?.value || "Male");

            if (!fName) {
                alert("First name is required.");
                return;
            }
            if (!uname) {
                alert("Username is required.");
                return;
            }
            if (!email) {
                alert("Email address is required.");
                return;
            }

            // Build updated user object
            const updatedUser = {
                ...user,
                name: `${fName} ${lName}`.trim(),
                username: uname,
                email: email,
                phone: phone,
                dob: dob,
                gender: gender
            };

            // Sync localStorage
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));

            const users = JSON.parse(localStorage.getItem("users")) || [];
            const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
            if (idx !== -1) {
                users[idx] = { ...users[idx], ...updatedUser };
                localStorage.setItem("users", JSON.stringify(users));
            }

            alert("Profile updated successfully!");
            renderProfilePage("main", updatedUser);
        };
    }
}

/* =========================================================================
   STANDARD PROFILE (For other roles: Guide, Experience, Non-Tech Admin)
   ========================================================================= */
function escapeHtml(value = "") {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return entities[char];
    });
}

async function renderStandardProfile(container, user) {
    const isGuide = (user.role || "").toLowerCase() === "guide";
    let guideData = null;

    if (isGuide) {
        try {
            guideData = await fetchGuide(user.id || user.userId);
        } catch (e) {
            console.warn("Could not fetch guide data:", e);
        }
    }

    const profileKey = user ? `profileData_${user.id}` : "profileData";
    profileData = JSON.parse(localStorage.getItem(profileKey)) || JSON.parse(localStorage.getItem("profileData")) || {
        location: guideData?.location || "Mumbai, India",
        experience: guideData?.years_exp ? `${guideData.years_exp} Years` : "5+ Years",
        professionalTitle: guideData?.prof_title || "Operations Specialist",
        bio: guideData?.bio || "Travel and logistics operations lead.",
        languages: guideData?.lang_spoken || ["English", "Hindi"],
        certifications: guideData?.certifications || [],
        bankDetails: { bankName: guideData?.bank_name || "HDFC Bank", accountEnding: guideData?.bank_acc_num_end || "4589", iban: guideData?.iban || "IN89HDFC000123456789" }
    };

    container.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <h1 class="profile-title">Profile</h1>
                <p class="profile-subtitle">Manage your account information and professional profile.</p>
            </div>

            <div class="profile-hero-card">
                <div class="profile-avatar-wrapper">
                    <img src="${user.profilePic || '../components/ui/profile.png'}" class="profile-avatar" id="profilePic">
                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                    <div class="upload-btn" id="uploadBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                </div>
                <div class="hero-info">
                    <h2 class="hero-name">${escapeHtml(user.name || 'User')}</h2>
                    <span class="hero-title">${escapeHtml(profileData.professionalTitle || 'Partner')}</span>
                    <div class="hero-meta">
                        <div class="meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>${escapeHtml(profileData.location || 'India')}</span>
                        </div>
                        <div class="meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span>${escapeHtml(profileData.experience || '3 Years')}</span>
                        </div>
                    </div>
                </div>
                <div class="badges">
                    <span class="badge verified">Verified</span>
                    <span class="badge premium">Premium</span>
                </div>
            </div>

            <form id="profileForm">
                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Personal Information</h3>
                        <button type="button" class="edit-btn" id="editPersonal">Edit</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <span class="label">First Name</span>
                            <input type="text" class="input-field" name="firstName" value="${escapeHtml((user.name || '').split(' ')[0])}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Last Name</span>
                            <input type="text" class="input-field" name="lastName" value="${escapeHtml((user.name || '').split(' ')[1] || '')}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Email Address</span>
                            <input type="email" class="input-field" name="email" value="${escapeHtml(user.email || '')}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Phone Number</span>
                            <input type="text" class="input-field" name="phone" value="${escapeHtml(user.phone || user.phno || '')}" disabled>
                        </div>
                        <div class="input-group full">
                            <span class="label">Location</span>
                            <input type="text" class="input-field" name="location" value="${escapeHtml(profileData.location || '')}" disabled>
                        </div>
                    </div>
                </div>

                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Professional Details</h3>
                        <button type="button" class="edit-btn" id="editProfessional">Edit</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <span class="label">Professional Title</span>
                            <input type="text" class="input-field" name="professionalTitle" value="${escapeHtml(profileData.professionalTitle || '')}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Years of Experience</span>
                            <input type="text" class="input-field" name="experience" value="${escapeHtml(profileData.experience || '')}" disabled>
                        </div>
                        <div class="input-group full">
                            <span class="label">Bio</span>
                            <textarea class="input-field" name="bio" disabled>${escapeHtml(profileData.bio || '')}</textarea>
                        </div>
                    </div>
                </div>

                <div class="save-all-container">
                    <button type="button" class="secondary-btn" onclick="window.history.back()">Cancel</button>
                    <button type="submit" class="primary-btn">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    setupStandardProfileListeners(user);
}

function setupStandardProfileListeners(user) {
    const uploadBtn = document.getElementById("uploadBtn");
    const avatarInput = document.getElementById("avatarInput");
    if (uploadBtn && avatarInput) {
        uploadBtn.onclick = () => avatarInput.click();
        avatarInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const base64 = re.target.result;
                    document.getElementById("profilePic").src = base64;
                    user.profilePic = base64;
                    localStorage.setItem("currentUser", JSON.stringify(user));
                };
                reader.readAsDataURL(file);
            }
        };
    }

    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = (e) => {
            const section = e.target.closest(".profile-section");
            const inputs = section.querySelectorAll("input, textarea");
            const isEditing = e.target.innerText === "Save";
            inputs.forEach(input => input.disabled = isEditing);
            e.target.innerText = isEditing ? "Edit" : "Save";
        };
    });

    const form = document.getElementById("profileForm");
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const isGuide = (user.role || "").toLowerCase() === "guide";
            
            try {
                if (isGuide) {
                    const guideUpdates = {
                        location: formData.get("location"),
                        prof_title: formData.get("professionalTitle"),
                        years_exp: parseInt(formData.get("experience")) || 0,
                        bio: formData.get("bio")
                    };
                    await updateGuideProfile(user.id || user.userId, guideUpdates);
                }

                // Update common user data
                const userUpdates = {
                    name: (formData.get("firstName") + " " + formData.get("lastName")).trim(),
                    email: formData.get("email"),
                    phone: formData.get("phone")
                };
                
                await updateUser(user.id || user.userId, userUpdates);
                
                Object.assign(user, userUpdates);
                localStorage.setItem("currentUser", JSON.stringify(user));
                
                alert("Profile updated successfully!");
                renderProfilePage("main", user);
            } catch (err) {
                console.error("Profile update failed", err);
                alert("Failed to update profile. " + (err.message || ""));
            }
        };
    }
}

