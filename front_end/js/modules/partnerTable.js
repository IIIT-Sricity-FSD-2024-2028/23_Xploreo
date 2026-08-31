import { partnerStatusStyles } from '../api/legacyData.js';

export function getPartnerTableShellHTML() {
    return `
        <div style="background:#fff; border-radius:20px; border:1px solid #edf2f7; overflow:hidden; margin-top: 32px;">
            <div style="padding:24px; display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 1px solid #f8fafc;">
                <div>
                    <h3 style="margin:0; font-size: 22px; color: #1a202c;">Service Partner Network</h3>
                    <p style="color:#718096; font-size:14px; margin:4px 0 0 0;">Manage institutional and boutique providers across the global ecosystem</p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="filter-btn partner-filter-btn active" data-filter="All">All</button>
                    <button class="filter-btn partner-filter-btn" data-filter="BOUTIQUE HOTEL">Boutique Hotel</button>
                    <button class="filter-btn partner-filter-btn" data-filter="TOUR OPERATOR">Tour Operator</button>
                    <button class="filter-btn partner-filter-btn" data-filter="TRANSPORT">Transport</button>
                </div>
            </div>

            <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                    <tr style="background:#f8fafc; color:#a0aec0; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
                        <th style="padding:16px 24px;">Partner Name</th>
                        <th style="padding:16px;">Business Type</th>
                        <th style="padding:16px;">Global Rating</th>
                        <th style="padding:16px;">Status</th>
                        <th style="padding:16px;">Joined Date</th>
                        <th style="padding:16px 24px;">Revenue Contribution</th>
                    </tr>
                </thead>
                <tbody id="partners-tbody">
                    </tbody>
            </table>
        </div>
    `;
}

export function generatePartnerRowsHTML(filteredData) {
    if (filteredData.length === 0) {
        return `
            <tr>
                <td colspan="6" style="padding:48px; text-align:center; color:#a0aec0; font-size: 15px;">
                    No partners found in this category.
                </td>
            </tr>`;
    }

    return filteredData.map(partner => `
        <tr style="border-top:1px solid #edf2f7; transition: background 0.2s;">
            <td style="padding:20px 24px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:#f7fafc; border:1px solid #edf2f7; display:flex; align-items:center; justify-content:center; color:#4a5568; font-weight:bold; font-size:12px;">
                        ${partner.initials}
                    </div>
                    <div>
                        <div style="font-weight:600; color:#2d3748; font-size:14px;">${partner.name}</div>
                        <div style="font-size:12px; color:#a0aec0;">${partner.location}</div>
                    </div>
                </div>
            </td>

            <td style="padding:20px 16px;">
                <span style="background:${partner.typeBg}; color:${partner.typeColor}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:0.02em;">
                    ${partner.type}
                </span>
            </td>

            <td style="padding:20px 16px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="color:#2d3748; font-weight:600;">${partner.rating}</span>
                    <span style="color:#f6ad55; font-size:14px;">★</span>
                </div>
            </td>

            <td style="padding:20px 16px;">
                <select class="status-select partner-status-select" data-id="${partner.id}" style="background:${partnerStatusStyles[partner.status].bg}; color:${partnerStatusStyles[partner.status].color}; border:none; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">
                    <option value="Verified" ${partner.status === 'Verified' ? 'selected' : ''}>Verified</option>
                    <option value="Under Review" ${partner.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                    <option value="Unverified" ${partner.status === 'Unverified' ? 'selected' : ''}>Unverified</option>
                </select>
            </td>

            <td style="padding:20px 16px; color:#718096; font-size:13px;">
                ${partner.joined}
            </td>

            <td style="padding:20px 24px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="flex:1; height:6px; background:#edf2f7; border-radius:10px; overflow:hidden;">
                        <div style="width:${partner.revenue}%; height:100%; background:#3182ce; border-radius:10px;"></div>
                    </div>
                    <span style="font-size:12px; font-weight:600; color:#4a5568; min-width:30px;">${partner.revenue}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}
