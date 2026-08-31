import { userStatusStyles } from '../api/legacyData.js';

export function getUserTableShellHTML() {
    return `
        <div style="background:#fff; border-radius:20px; border:1px solid #edf2f7; overflow:hidden;">
            <div style="padding:24px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h3 style="margin:0;">Manage Platform Users</h3>
                    <p style="color:#718096; font-size:14px; margin:4px 0 0 0;">Comprehensive directory of all registered accounts</p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="filter-btn user-filter-btn active" data-filter="All">All</button>
                    <button class="filter-btn user-filter-btn" data-filter="Traveler">Travelers</button>
                    <button class="filter-btn user-filter-btn" data-filter="Guide">Guides</button>
                </div>
            </div>
            <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                    <tr style="background:#f8fafc; color:#a0aec0; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
                        <th style="padding:16px 24px;">ID</th>
                        <th style="padding:16px;">User</th>
                        <th style="padding:16px;">Role</th>
                        <th style="padding:16px;">Status</th>
                        <th style="padding:16px;">Joined</th>
                        <th style="padding:16px 24px; text-align:center;">Action</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
        </div>
    `;
}

export function generateUserRowsHTML(filteredData) {
    if (filteredData.length === 0) return `<tr><td colspan="6" style="padding:24px; text-align:center; color:#a0aec0;">No users found.</td></tr>`;

    return filteredData.map(user => `
        <tr class="user-row" data-id="${user.id}" style="cursor:pointer; border-top:1px solid #edf2f7; transition: background 0.2s;">
            <td style="padding:20px 24px; color:#718096; font-size:13px;">${user.id}</td>
            <td style="padding:20px 16px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:50%; background:${user.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px;">
                        ${user.initials}
                    </div>
                    <div>
                        <div style="font-weight:600; color:#2d3748; font-size:14px;">${user.name}</div>
                        <div style="font-size:12px; color:#a0aec0;">${user.email}</div>
                    </div>
                </div>
            </td>
            <td style="padding:20px 16px;"><span class="role-badge">${user.role}</span></td>
            <td style="padding:20px 16px;">
                <select class="status-select user-status-select" data-id="${user.id}" style="background:${userStatusStyles[user.status].bg}; color:${userStatusStyles[user.status].color};">
                    <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Pending" ${user.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </td>
            <td style="padding:20px 16px; color:#718096; font-size:13px;">${user.joined}</td>
            <td style="padding:20px 24px; text-align:center;">
                <button class="remove-btn" data-id="${user.id}" title="Remove User">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}
