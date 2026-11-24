export function initTechActivity() {
    let techAdminData = JSON.parse(localStorage.getItem("techAdminData"));
    if (!techAdminData) return;

    let searchQuery = "";

    const renderActivity = () => {
        const tbody = document.getElementById("activity-tbody");
        if (!tbody) return;

        const filteredActivity = techAdminData.userActivity.filter(act => {
            return (act.userName && act.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                   (act.action && act.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
                   (act.userId && act.userId.toLowerCase().includes(searchQuery.toLowerCase()));
        });

        tbody.innerHTML = filteredActivity.map(act => `
            <tr class="activity-row">
                <td style="color: #6B7280; font-size: 13px;">${new Date(act.timestamp).toLocaleString()}</td>
                <td style="font-weight: 600;">${act.userName}</td>
                <td style="font-family: monospace; color: #3b82f6;">${act.userId}</td>
                <td style="font-size: 14px; color: #374151;">${act.action}</td>
                <td style="text-align: right;"><span class="status-tag resolved">Success</span></td>
            </tr>
        `).join(''); // Data is likely already reverse sorted by timestamp in data/localStorage
    };

    // Search
    const searchInput = document.getElementById("activity-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            renderActivity();
        });
    }

    // Initial Render
    renderActivity();
}

