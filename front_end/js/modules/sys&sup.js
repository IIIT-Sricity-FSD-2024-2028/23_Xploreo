export function initSystemSupport() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // =======================
    // 🔹 ROLES & PERMISSIONS DATA
    // =======================
    const rolesData = [
        {
            id: "superadmin",
            title: "Super Admin",
            desc: "Full system access",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`
        },
        {
            id: "moderator",
            title: "Moderator",
            desc: "Content & Support management",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>`
        },
        {
            id: "support",
            title: "Partner Support",
            desc: "Booking & Merchant relations",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
        }
    ];

    const permissionsData = {
        superadmin: [
            { id: "sa_1", title: "Full System Configuration", desc: "Modify core platform settings and environment variables", active: true },
            { id: "sa_2", title: "Manage Billing & Subscriptions", desc: "Access to platform billing and Stripe configurations", active: true },
            { id: "sa_3", title: "Global Analytics", desc: "View cross-tenant financial and operational reports", active: true }
        ],
        moderator: [
            { id: "mod_1", title: "View Financial Reports", desc: "Access to revenue data and payouts", active: false },
            { id: "mod_2", title: "Manage User Profiles", desc: "Edit user details and reset passwords", active: true },
            { id: "mod_3", title: "Delete Bookings", desc: "Permanent removal of transaction records", active: false },
            { id: "mod_4", title: "Resolve Support Tickets", desc: "Access to the resolution center", active: true }
        ],
        support: [
            { id: "sup_1", title: "View Bookings", desc: "Read-only access to customer itineraries and bookings", active: true },
            { id: "sup_2", title: "Process Refunds", desc: "Initiate partial or full refunds within SLA limits", active: false },
            { id: "sup_3", title: "Contact Partners", desc: "Direct messaging access to merchant endpoints", active: true }
        ]
    };

    // Current state
    let activeRole = "moderator";

    // =======================
    // 🔹 HTML SKELETON
    // =======================
    mainContainer.innerHTML = `
        <div class="page-header" style="margin-bottom: 32px;">
            <h1 class="page-title" style="margin-top: 0; font-size: 28px; color: #1a202c; font-weight: 700;">
                Roles & Permissions
            </h1>
            <p class="page-subtitle" style="margin: 8px 0 0; font-size: 15px; color: #718096; line-height: 1.5;">
                Manage access levels and granular control for your team members.
            </p>
        </div>
        
        <div id="system-content" style="display: flex; gap: 32px; align-items: flex-start;">
            
            <div id="roles-list" style="display: flex; flex-direction: column; gap: 12px; width: 320px; flex-shrink: 0;">
                </div>

            <div id="permissions-panel" style="flex: 1; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.04); border: 1px solid #edf2f7;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                    <h2 id="permissions-header" style="margin: 0; font-size: 20px; color: #1a202c; font-weight: 700;">
                        Moderator Permissions
                    </h2>
                    <button style="background: #1a73e8; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Save Changes
                    </button>
                </div>

                <div id="permissions-list" style="display: flex; flex-direction: column;">
                    </div>
            </div>

        </div>
    `;

    // =======================
    // 🔹 RENDER FUNCTIONS
    // =======================
    const renderRoles = () => {
        const rolesContainer = document.getElementById('roles-list');
        rolesContainer.innerHTML = rolesData.map(role => {
            const isActive = role.id === activeRole;
            const borderStyle = isActive ? "border: 2px solid #1a73e8; border-top: 4px solid #1a73e8;" : "border: 2px solid transparent; border-bottom: 1px solid #edf2f7;";
            const titleColor = isActive ? "#1a73e8" : "#1a202c";
            const iconColor = isActive ? "#1a73e8" : "#a0aec0";
            const bgStyle = isActive ? "background: #fff;" : "background: #f7fafc;";
            const shadow = isActive ? "box-shadow: 0 4px 12px rgba(26, 115, 232, 0.08);" : "";

            return `
                <div class="role-card" data-role="${role.id}" style="${bgStyle} ${borderStyle} ${shadow} border-radius: 12px; padding: 20px 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
                    <div>
                        <div style="font-weight: 700; font-size: 16px; color: ${titleColor}; margin-bottom: 4px;">${role.title}</div>
                        <div style="font-size: 13px; color: #718096;">${role.desc}</div>
                    </div>
                    <div style="color: ${iconColor};">
                        ${role.icon}
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', (e) => {
                activeRole = e.currentTarget.dataset.role;
                renderRoles();
                renderPermissions();
            });
        });
    };

    const renderPermissions = () => {
        const activeRoleObj = rolesData.find(r => r.id === activeRole);
        document.getElementById('permissions-header').innerText = `${activeRoleObj.title} Permissions`;

        const perms = permissionsData[activeRole];
        const permsContainer = document.getElementById('permissions-list');
        
        permsContainer.innerHTML = perms.map((perm, index) => {
            const isLast = index === perms.length - 1;
            const borderBottom = isLast ? "none" : "1px solid #edf2f7";
            const toggleBg = perm.active ? "#1a73e8" : "#e2e8f0";
            const toggleTransform = perm.active ? "translateX(20px)" : "translateX(0)";

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: ${borderBottom};">
                    <div>
                        <div style="font-weight: 700; font-size: 15px; color: #1a202c; margin-bottom: 4px;">${perm.title}</div>
                        <div style="font-size: 13px; color: #718096;">${perm.desc}</div>
                    </div>
                    
                    <div class="perm-toggle" data-id="${perm.id}" style="width: 44px; height: 24px; background: ${toggleBg}; border-radius: 12px; position: relative; cursor: pointer; transition: background 0.3s ease;">
                        <div style="position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transform: ${toggleTransform}; transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach toggle logic
        document.querySelectorAll('.perm-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const permIndex = perms.findIndex(p => p.id === id);
                if (permIndex > -1) {
                    perms[permIndex].active = !perms[permIndex].active;
                    renderPermissions(); // Re-render to show updated toggle state
                }
            });
        });
    };

    // Initialize the views
    renderRoles();
    renderPermissions();
}