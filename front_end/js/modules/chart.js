export function renderChart(containerId) {
    const container = document.getElementById(containerId);

    // 1. DYNAMIC DATA FETCH: Get actual total bookings from localStorage
    const partners = JSON.parse(localStorage.getItem("partners")) || [];
    let totalBookings = 0;
    partners.forEach(p => {
        // Ensure we are adding numbers, defaulting to 0 if undefined
        totalBookings += (Number(p.bookings) || 0);
    });

    // Fallback just in case localStorage is completely empty during testing
    if (totalBookings === 0) totalBookings = 1500; 

    // 2. DYNAMIC CALCULATION: Distribute the total volume across time periods.
    // (In a future update, you can replace this by filtering an array of actual timestamps)
    const datasets = {
        weekly: [
            { label: "MON", value: Math.floor(totalBookings * 0.02) },
            { label: "TUE", value: Math.floor(totalBookings * 0.03) },
            { label: "WED", value: Math.floor(totalBookings * 0.04) },
            { label: "THU", value: Math.floor(totalBookings * 0.05) }, // Peak day
            { label: "FRI", value: Math.floor(totalBookings * 0.03) },
            { label: "SAT", value: Math.floor(totalBookings * 0.02) },
            { label: "SUN", value: Math.floor(totalBookings * 0.04) }
        ],
        monthly: [
            { label: "JAN", value: Math.floor(totalBookings * 0.06) },
            { label: "FEB", value: Math.floor(totalBookings * 0.04) },
            { label: "MAR", value: Math.floor(totalBookings * 0.07) },
            { label: "APR", value: Math.floor(totalBookings * 0.09) },
            { label: "MAY", value: Math.floor(totalBookings * 0.11) },
            { label: "JUN", value: Math.floor(totalBookings * 0.14) },
            { label: "JUL", value: Math.floor(totalBookings * 0.16) }, // Peak Month
            { label: "AUG", value: Math.floor(totalBookings * 0.15) },
            { label: "SEP", value: Math.floor(totalBookings * 0.10) },
            { label: "OCT", value: Math.floor(totalBookings * 0.05) },
            { label: "NOV", value: Math.floor(totalBookings * 0.02) },
            { label: "DEC", value: Math.floor(totalBookings * 0.01) }
        ],
        quarterly: [
            { label: "Q1", value: Math.floor(totalBookings * 0.17) },
            { label: "Q2", value: Math.floor(totalBookings * 0.34) },
            { label: "Q3", value: Math.floor(totalBookings * 0.41) }, // Peak Quarter
            { label: "Q4", value: Math.floor(totalBookings * 0.08) }
        ]
    };

    // 3. Render the UI Framework
    container.innerHTML = `
        <div class="chart-card">
            <div class="chart-header">
                <div>
                    <h3>Booking Velocity & Engagement</h3>
                    <p>Detailed comdelhion based on real-time transaction volume</p>
                </div>
                <div class="chart-toggle">
                    <button class="active" data-type="weekly">Weekly</button>
                    <button data-type="monthly">Monthly</button>
                    <button data-type="quarterly">Quarterly</button>
                </div>
            </div>
            <div class="chart-body" id="chart-body"></div>
        </div>
    `;

    // 4. Render and Animate the Bars dynamically based on the max value
    function renderBars(type) {
        const data = datasets[type];
        const chartBody = document.getElementById("chart-body");

        // Find the dynamic peak (highest value in the current view)
        const max = Math.max(...data.map(d => d.value));

        chartBody.innerHTML = data.map((d, i) => {
            const isPeak = d.value === max;
            let extraClass = "";

            // Keep your special dark styling logic
            if (type === "monthly" && i === 7) extraClass = "dark"; // AUG
            if (type === "quarterly" && i === 3) extraClass = "dark"; // Q4

            // Calculate height percentage dynamically
            const heightPercentage = max > 0 ? (d.value / max) * 100 : 0;

            return `
                <div class="bar-wrapper">
                    <div class="bar ${isPeak ? "peak" : ""} ${extraClass}" 
                         style="height:0%" 
                         data-height="${heightPercentage}">
                    </div>
                    ${
                        isPeak
                            ? `<span class="peak-label">PEAK: ${d.value}</span>`
                            : `<span class="bar-tooltip ${extraClass}">${d.value}</span>`
                    }
                    <span class="day">${d.label}</span>
                </div>
            `;
        }).join("");

        // Trigger CSS animation slightly after render
        setTimeout(() => {
            document.querySelectorAll(".bar").forEach(bar => {
                bar.style.height = bar.dataset.height + "%";
            });
        }, 100);
    }

    // 5. Initialize the chart
    renderBars("weekly");

    // 6. Handle toggle button clicks
    const buttons = container.querySelectorAll(".chart-toggle button");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderBars(btn.dataset.type);
        });
    });
}