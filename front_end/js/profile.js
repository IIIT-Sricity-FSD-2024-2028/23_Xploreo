let profileData = null;
let currentUser = null;

export function renderProfilePage(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;

    currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const profileKey = currentUser ? `profileData_${currentUser.id}` : "profileData";
    profileData = JSON.parse(localStorage.getItem(profileKey));

    if (!profileData) {
        profileData = JSON.parse(localStorage.getItem("profileData"));
    }

    // Role-specific Stats Calculation
    let extraStats = "";
    if (currentUser.role === "techadmin") {
        const techData = JSON.parse(localStorage.getItem("techAdminData"));
        if (techData) {
            const resolvedCount = techData.tickets.filter(t => t.status === 'resolved').length;
            const logCount = techData.systemLogs.length;
            extraStats = `
                <div class="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span>${resolvedCount} Tickets Resolved</span>
                </div>
                <div class="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>${logCount} System Logs</span>
                </div>
            `;
        }
    } else {
        extraStats = `
            <div class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${techData.location}</span>
            </div>
            <div class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>${profileData.experience}</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <h1 class="profile-title">${currentUser.role === 'techadmin' ? 'Technical Admin Profile' : 'Profile'}</h1>
                <p class="profile-subtitle">Manage your account information and system settings.</p>
            </div>

            <div class="profile-hero-card">
                <div class="profile-avatar-wrapper">
                    <img src="${currentUser.profilePic || '../../components/ui/profile.png'}" class="profile-avatar" id="profilePic">
                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                    <div class="upload-btn" id="uploadBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                </div>
                <div class="hero-info">
                    <h2 class="hero-name">${currentUser.name}</h2>
                    <span class="hero-title">${currentUser.role === 'techadmin' ? 'System Administrator' : profileData.professionalTitle}</span>
                    <div class="hero-meta">
                        ${extraStats}
                    </div>
                </div>
                <div class="badges">
                    <span class="badge verified">${currentUser.role === 'techadmin' ? 'Authorized' : 'Verified'}</span>
                    <span class="badge premium">${currentUser.role === 'techadmin' ? 'System Full Access' : 'Premium'}</span>
                </div>
            </div>

            <form id="profileForm">
                <!-- Personal Information -->
                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Personal Information</h3>
                        <button type="button" class="edit-btn" id="editPersonal">Edit</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <span class="label">First Name</span>
                            <input type="text" class="input-field" name="firstName" value="${currentUser.name.split(' ')[0]}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Last Name</span>
                            <input type="text" class="input-field" name="lastName" value="${currentUser.name.split(' ')[1] || ''}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Email Address</span>
                            <input type="email" class="input-field" name="email" value="${currentUser.email}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Phone Number</span>
                            <input type="text" class="input-field" name="phone" value="${currentUser.phone || currentUser.phno}" disabled>
                        </div>
                        <div class="input-group full">
                            <span class="label">Location</span>
                            <input type="text" class="input-field" name="location" value="${profileData.location}" disabled>
                        </div>
                    </div>
                </div>

                ${currentUser.role !== 'techadmin' ? `
                <!-- Professional Details -->
                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Professional Details</h3>
                        <button type="button" class="edit-btn" id="editProfessional">Edit</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <span class="label">Professional Title</span>
                            <input type="text" class="input-field" name="professionalTitle" value="${profileData.professionalTitle}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Years of Experience</span>
                            <input type="text" class="input-field" name="experience" value="${profileData.experience}" disabled>
                        </div>
                        <div class="input-group full">
                            <span class="label">Bio</span>
                            <textarea class="input-field" name="bio" disabled>${profileData.bio}</textarea>
                        </div>
                        <div class="input-group full">
                            <span class="label">Languages Spoken</span>
                            <div class="lang-list" id="langList">
                                ${profileData.languages.map((l, i) => `
                                    <span class="lang-tag">
                                        ${l}
                                        <span class="remove-tag" data-idx="${i}" onclick="window.removeLang(${i})" style="cursor: pointer; margin-left: 5px; opacity: 0.7;">×</span>
                                    </span>
                                `).join('')}
                                <button type="button" class="edit-btn" id="addLangBtn" style="padding: 4px 10px; font-size: 11px;">+ Add Language</button>
                            </div>
                        </div>
                        ${currentUser.role !== 'experience' ? `
                        <div class="input-group full">
                            <span class="label">Certifications</span>
                            <div class="cert-list">
                                ${profileData.certifications.map((c, i) => `
                                    <div class="cert-item">
                                        <div class="cert-info">
                                            <span class="cert-name">${c.name}</span>
                                            <span class="cert-expiry">Valid until ${c.expiry}</span>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span class="badge verified">Verified</span>
                                            <button type="button" class="remove-tag" onclick="window.removeCert(${i})" style="background: none; border: none; color: #ff4444; cursor: pointer; font-size: 18px;">×</button>
                                        </div>
                                    </div>
                                `).join('')}
                                <button type="button" class="edit-btn" id="addCertBtn" style="width: fit-content;">+ Add Certification</button>
                                <input type="file" id="certFileInput" accept=".pdf,image/*" style="display: none;">
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Bank Details -->
                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Bank Details</h3>
                        <button type="button" class="edit-btn" id="editBank">Update</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <span class="label">Bank Name</span>
                            <input type="text" class="input-field" name="bankName" value="${profileData.bankDetails.bankName}" disabled>
                        </div>
                        <div class="input-group">
                            <span class="label">Account Ending In</span>
                            <input type="text" class="input-field" name="accountEnding" value="${profileData.bankDetails.accountEnding}" disabled>
                        </div>
                        <div class="input-group full">
                            <span class="label">IBAN</span>
                            <input type="text" class="input-field" name="iban" value="${profileData.bankDetails.iban}" disabled>
                        </div>
                    </div>
                </div>
                ` : `

                <!-- Admin Security Log Context -->
                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Admin Work Log</h3>
                    </div>
                    <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; font-size: 14px; color: #4B5563;">
                        <p><strong>Access Level:</strong> Superuser (Level 1)</p>
                        <p><strong>Last System Sync:</strong> ${new Date().toLocaleString()}</p>
                        <p style="margin-bottom: 0;"><strong>Active Tickets in Queue:</strong> ${JSON.parse(localStorage.getItem("techAdminData")).tickets.filter(t => t.status === 'pending').length}</p>
                    </div>
                </div>
                `}

                <!-- Security -->
                <div class="profile-section">
                    <div class="section-header">
                        <h3 class="section-title">Security & Password</h3>
                    </div>
                    <div class="form-grid">
                        <div class="input-group full">
                            <span class="label">Current Password</span>
                            <input type="password" class="input-field" id="currPass" placeholder="Enter current password">
                        </div>
                        <div class="input-group">
                            <span class="label">New Password</span>
                            <input type="password" class="input-field" id="newPass" placeholder="Enter new password">
                        </div>
                        <div class="input-group">
                            <span class="label">Confirm New Password</span>
                            <input type="password" class="input-field" id="confirmPass" placeholder="Confirm new password">
                        </div>
                        <div class="input-group">
                            <button type="button" class="primary-btn" style="width: fit-content; padding: 0.6rem 1.5rem;" id="changePassBtn">Change Password</button>
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


    setupProfileListeners();
}

function setupProfileListeners() {
    // Profile Pic Upload
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
                    currentUser.profilePic = base64;
                    localStorage.setItem("currentUser", JSON.stringify(currentUser));
                    
                    // Sync main users list
                    const users = JSON.parse(localStorage.getItem("users")) || [];
                    const userIdx = users.findIndex(u => u.id === currentUser.id);
                    if (userIdx !== -1) {
                        users[userIdx].profilePic = base64;
                        localStorage.setItem("users", JSON.stringify(users));
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Add Language
    const addLangBtn = document.getElementById("addLangBtn");
    if (addLangBtn) {
        addLangBtn.onclick = () => {
            const newLang = prompt("Enter language name:");
            if (newLang && newLang.trim()) {
                profileData.languages.push(newLang.trim());
                localStorage.setItem("profileData", JSON.stringify(profileData));
                renderProfilePage("main", currentUser);
            }
        };
    }

    // Deletion Handlers
    window.removeLang = (idx) => {
        profileData.languages.splice(idx, 1);
        localStorage.setItem("profileData", JSON.stringify(profileData));
        renderProfilePage("main", currentUser);
    };

    window.removeCert = (idx) => {
        profileData.certifications.splice(idx, 1);
        localStorage.setItem("profileData", JSON.stringify(profileData));
        renderProfilePage("main", currentUser);
    };

    // Add Certification
    const addCertBtn = document.getElementById("addCertBtn");
    const certFileInput = document.getElementById("certFileInput");
    if (addCertBtn && certFileInput) {
        addCertBtn.onclick = () => {
            const name = prompt("Enter certification name:");
            if (!name) return;
            const expiry = prompt("Enter expiry (e.g. Dec 2027):", "Dec 2027");
            
            // Simulation: After details, trigger file upload for "Upload Certificate"
            alert("Please select the certificate file/image.");
            certFileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        profileData.certifications.push({
                            id: Date.now(),
                            name: name.trim(),
                            expiry: expiry || "N/A",
                            file: re.target.result, // Base64
                            verified: false
                        });
                        localStorage.setItem("profileData", JSON.stringify(profileData));
                        renderProfilePage("main", currentUser);
                    };
                    reader.readAsDataURL(file);
                }
            };
            certFileInput.click();
        };
    }

    // Toggle Edit Mode (Only for section-level controls, not ADD buttons)
    document.querySelectorAll(".edit-btn:not([id*='add'])").forEach(btn => {
        btn.onclick = (e) => {
            const section = e.target.closest(".profile-section");
            const inputs = section.querySelectorAll("input:not([type='file']), textarea");
            const isEditing = e.target.innerText === "Save";

            inputs.forEach(input => input.disabled = isEditing);
            
            if (isEditing) {
                e.target.innerText = (e.target.id === "editBank" ? "Update" : "Edit");
                e.target.classList.remove("active-edit");
            } else {
                e.target.innerText = "Save";
                e.target.classList.add("active-edit");
                if (inputs[0]) inputs[0].focus();
            }
        };
    });

    // Form Submit (Global Save) - ROBUST FIX: Captures even disabled inputs
    document.getElementById("profileForm").onsubmit = (e) => {
        e.preventDefault();
        
        // Manual gathering to include disabled fields
        const getVal = (name) => {
            const el = e.target.querySelector(`[name="${name}"]`);
            return el ? el.value : "";
        };

        // Update LocalStorage structures
        const updatedUser = { 
            ...currentUser, 
            name: `${getVal('firstName')} ${getVal('lastName')}`,
            email: getVal('email'),
            phone: getVal('phone')
        };
        
        const updatedProfile = {
            ...profileData,
            location: getVal('location'),
            bio: getVal('bio'),
            professionalTitle: getVal('professionalTitle'),
            experience: getVal('experience'),
            bankDetails: {
                ...profileData.bankDetails,
                bankName: getVal('bankName'),
                accountEnding: getVal('accountEnding'),
                iban: getVal('iban')
            }
        };

        // Sync to localStorage
        const profileKey = `profileData_${updatedUser.id}`;
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
        localStorage.setItem("profileData", JSON.stringify(updatedProfile)); // Keep legacy key in sync too
        
        // Update main users list for overall integrity
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const userIdx = users.findIndex(u => u.id === updatedUser.id);
        if (userIdx !== -1) {
            users[userIdx] = updatedUser;
            localStorage.setItem("users", JSON.stringify(users));
        }

        // Sync with backend API
        if (updatedUser.id) {
            apiPatch(`/auth/users/${updatedUser.id}`, updatedUser).catch(err => {
                console.warn("[Profile API Update Error]:", err);
            });
        }

        alert("Profile updated successfully!");
        window.location.reload();
    };

    // Change Password
    const changePassBtn = document.getElementById("changePassBtn");
    if (changePassBtn) {
        changePassBtn.onclick = () => {
            const curr = document.getElementById("currPass").value;
            const n1 = document.getElementById("newPass").value;
            const n2 = document.getElementById("confirmPass").value;

            if (curr !== currentUser.password) {
                alert("Current password is incorrect.");
                return;
            }
            if (n1 !== n2) {
                alert("New passwords do not match.");
                return;
            }
            if (n1.length < 4) {
                alert("Password must be at least 4 characters.");
                return;
            }

            // Update in all places
            currentUser.password = n1;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            
            const users = JSON.parse(localStorage.getItem("users")) || [];
            const userIdx = users.findIndex(u => u.id === currentUser.id);
            if (userIdx !== -1) {
                users[userIdx].password = n1;
                localStorage.setItem("users", JSON.stringify(users));
            }

            alert("Password changed successfully!");
            document.getElementById("currPass").value = "";
            document.getElementById("newPass").value = "";
            document.getElementById("confirmPass").value = "";
        };
    }
}
