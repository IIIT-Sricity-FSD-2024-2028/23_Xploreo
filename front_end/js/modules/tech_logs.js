export function initTechLogs() {
    let techAdminData = JSON.parse(localStorage.getItem("techAdminData"));
    if (!techAdminData) return;

    let searchQuery = "";

    const renderLogs = () => {
        const tbody = document.getElementById("logs-tbody");
        if (!tbody) return;

        const filteredLogs = techAdminData.systemLogs.filter(log => {
            return (log.source && log.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
                   (log.message && log.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
                   (log.id && log.id.toLowerCase().includes(searchQuery.toLowerCase()));
        });

        tbody.innerHTML = filteredLogs.map(log => `
            <tr class="log-row">
                <td style="color: #6B7280; font-size: 13px;">${new Date(log.timestamp).toLocaleString()}</td>
                <td><span class="status-tag ${log.type}">${log.type}</span></td>
                <td style="font-weight: 600;">${log.source}</td>
                <td style="font-size: 14px; color: #374151;">${log.message}</td>
                <td style="text-align: right;">
                    ${log.type === 'error' ? `
                        <button class="secondary-btn" style="padding: 4px 10px; font-size: 12px; border-color: #10b981; color: #10b981;" 
                                onclick="window.resolveLog('${log.id}')">Resolve</button>
                    ` : `
                        <span class="status-tag resolved">Logged</span>
                    `}
                </td>
            </tr>
        `).reverse().join('');
    };

    window.resolveLog = (id) => {
        const logIndex = techAdminData.systemLogs.findIndex(l => l.id === id);
        if (logIndex !== -1) {
            // In a real app, we might move this to a 'resolved' state or archive it
            // For now, let's mark it as 'info' to show it's "resolved" or remove it
            techAdminData.systemLogs[logIndex].type = 'info';
            techAdminData.systemLogs[logIndex].message += " (RESOLVED)";
            
            localStorage.setItem("techAdminData", JSON.stringify(techAdminData));
            renderLogs();
        }
    };

    // Search
    const searchInput = document.getElementById("logs-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            renderLogs();
        });
    }

    // Initial Render
    renderLogs();
}

