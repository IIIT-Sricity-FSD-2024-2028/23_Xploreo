export function renderAlerts(containerId) {
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <div class="alerts-card-modern">

            <!-- HEADER -->
            <div class="alerts-header">
                <div class="alerts-title">
                    <img src="../components/ui/warning.svg" class="icon-img"/>
                    <span>CRITICAL ALERTS</span>
                </div>

                <div class="alerts-badge">3 ACTION ITEMS</div>
            </div>

            <!-- MAIN ALERT -->
            <div class="alert-main">

                <div class="alert-icon">
                    <img src="../components/ui/hammer.svg" class="icon-img"/>
                </div>

                <div class="alert-content">
                    <h4>Legal Dispute: Booking #8421</h4>
                    <p>
                        Partner Alpine Heights reporting a double-booking
                        conflict from API sync error.
                    </p>

                    <span class="alert-time">OVERDUE • 2H AGO</span>
                </div>

            </div>

        </div>
    `;
}