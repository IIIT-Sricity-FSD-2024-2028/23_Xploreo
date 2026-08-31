import { userStatusStyles, activityIcons } from '../api/legacyData.js';

export function generateProfileHTML(user) {
    if (!user) {
        return `
            <div style="text-align:center; color:#a0aec0; padding:60px 20px;">
                <div style="font-size: 40px; margin-bottom: 16px; opacity: 0.3;">👤</div>
                <p>Select a user from the table to view their full profile and activity history.</p>
            </div>
        `;
    }

    // This version is strictly for viewing user details in the sidebar
    return `
        <div style="text-align:center; margin-bottom:32px;">
            <div style="width:90px; height:90px; border-radius:50%; background:${user.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:600; margin:0 auto 16px; border:4px solid #f8fafc; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                ${user.initials}
            </div>
            <h2 style="margin:0; font-size:24px; color:#1a202c;">${user.name}</h2>
            <p style="color:#718096; margin:4px 0 0 0; font-size:14px;">${user.email}</p>
            <div style="margin-top:12px; display: flex; justify-content: center; gap: 8px;">
                <span style="background: #edf2f7; color: #4a5568; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${user.role}</span>
                <span style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${userStatusStyles[user.status].bg}; color: ${userStatusStyles[user.status].color};">${user.status}</span>
            </div>
        </div>

        <div style="margin-bottom:32px;">
            <p style="font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:16px; border-bottom: 1px solid #f7fafc; padding-bottom: 8px;">Recent Activity</p>
            <div style="display:flex; flex-direction:column; gap:20px;">
                ${user.activity && user.activity.length > 0 ? user.activity.map(act => `
                    <div style="display:flex; gap:12px;">
                        <div style="width:32px; height:32px; border-radius:10px; background:${act.bg}; color:${act.color}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            ${activityIcons[act.type]}
                        </div>
                        <div>
                            <div style="font-size:14px; font-weight:600; color:#2d3748;">${act.title}</div>
                            <div style="font-size:12px; color:#a0aec0; margin-top:2px;">${act.time}</div>
                        </div>
                    </div>
                `).join('') : '<p style="font-size:12px; color:#a0aec0;">No recent activity recorded.</p>'}
            </div>
        </div>

        <div>
            <p style="font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:16px;">Platform Summary</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div style="background:#f8fafc; padding:16px; border-radius:16px; border:1px solid #edf2f7;">
                    <div style="font-size:11px; color:#718096; font-weight:600; text-transform:uppercase;">Total Spent</div>
                    <div style="font-size:20px; font-weight:700; color:#2d3748; margin-top:4px;">${user.summary?.spent || '₹0'}</div>
                </div>
                <div style="background:#f8fafc; padding:16px; border-radius:16px; border:1px solid #edf2f7;">
                    <div style="font-size:11px; color:#718096; font-weight:600; text-transform:uppercase;">Trips Done</div>
                    <div style="font-size:20px; font-weight:700; color:#2d3748; margin-top:4px;">${user.summary?.trips || '0'}</div>
                </div>
            </div>
        </div>

        <div style="margin-top:32px; padding-top:20px; border-top:1px solid #edf2f7; text-align:center;">
            <button style="background:none; border:1px solid #e2e8f0; color:#4a5568; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; width:100%;">
                View Full Logs
            </button>
        </div>
    `;
}
