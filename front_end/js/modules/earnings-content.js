export function renderEarningsContent(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allRequests = JSON.parse(localStorage.getItem("tours")) || [];
    let myCompleted = allRequests.filter(req => 
        String(req.guideId).trim() === String(currentUser.id).trim() && req.status === "completed"
    );
    
    const totalEarnings = myCompleted.reduce((acc, tour) => acc + (Number(tour.amount) || 0), 0) + 18000;

    const html = `
        <div class="welcome earnings-welcome-spacing">
            <h1>Earnings Dashboard</h1>
            <p>Track your historical performance and payouts</p>
        </div>

        <div class="stats-grid earnings-stats-spacing">
            <div class="stat-card blue">
                <p class="stat-label">Available Payout</p>
                <h2 class="stat-value">₹1,240</h2>
                <p class="stat-subtext text-emerald">Transfer to bank</p>
            </div>
            <div class="stat-card dark-green">
                <p class="stat-label">Total Earnings</p>
                <h2 class="stat-value">₹${totalEarnings.toLocaleString()}</h2>
                <p class="stat-subtext">Lifetime performance</p>
            </div>
            <div class="stat-card orange">
                <p class="stat-label">Expected Next Month</p>
                <h2 class="stat-value">₹2,100</h2>
                <p class="stat-subtext">Based on bookings</p>
            </div>
        </div>

        <div class="content-card dash-section-spacing card-padding-large">
            <div class="dash-earnings-wrapper">
                <h2 class="dash-section-title">Revenue Trends</h2>
                <p class="dash-section-subtitle">Monthly breakdown (Mock Data)</p>
                
                <div class="dash-chart-container chart-tall">
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-35"></div><span class="chart-label">Apr</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-45"></div><span class="chart-label">May</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-40"></div><span class="chart-label">Jun</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-70"></div><span class="chart-label">Jul</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-85"></div><span class="chart-label">Aug</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-60"></div><span class="chart-label">Sep</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-50"></div><span class="chart-label">Oct</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-80"></div><span class="chart-label">Nov</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-65"></div><span class="chart-label">Dec</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-95"></div><span class="chart-label">Jan</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-75"></div><span class="chart-label">Feb</span></div>
                    <div class="dash-chart-bar-group"><div class="dash-chart-bar bar-purple h-85"></div><span class="chart-label">Mar</span></div>
                </div>
            </div>
        </div>

        <div class="content-card dash-section-spacing card-padding-large">
            <h2 class="dash-section-title title-spaced">Transaction History</h2>
            <div class="tours-list-vertical">
                ${myCompleted.length > 0 ? myCompleted.map(c => `
                    <div class="transaction-row">
                        <div class="transaction-info">
                            <h3 class="transaction-title">${c.title}</h3>
                            <span class="transaction-date">${c.dateTime.split(" | ")[0]} - ${c.customer}</span>
                        </div>
                        <h3 class="transaction-amount">+₹${c.amount}</h3>
                    </div>
                `).join('') : '<p class="no-data">No earnings history found.</p>'}
            </div>
        </div>
    `;

    container.innerHTML = html;
}
