export function renderOverviewToolbar(currentYear) {
    return `
        <!-- Year selector + Export -->
        <div class="earn-toolbar">
            <select class="earn-year-select">
                <option>${currentYear}</option>
                <option>${currentYear - 1}</option>
            </select>
            <button class="earn-export-btn" onclick="alert('Report exported!')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export Report
            </button>
        </div>
    `;
}
