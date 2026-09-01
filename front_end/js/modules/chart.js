export function renderChart(containerId, bookings = []) {
    const container = document.getElementById(containerId);

    // 1. DYNAMIC DATA FETCH
    let totalBookings = bookings.length;
    if (totalBookings === 0) {
        const partners = JSON.parse(localStorage.getItem("partners")) || [];
        partners.forEach(p => {
            totalBookings += (Number(p.bookings) || 0);
        });
    }

    // 2. DYNAMIC CALCULATION: Distribute the total volume across time periods based on actual dates.
    const weeklyCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
    const monthlyCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Jan to Dec
    const quarterlyCounts = [0, 0, 0, 0]; // Q1 to Q4

    if (bookings.length > 0) {
        bookings.forEach(b => {
            const d = new Date(b.date || b.bookedOn || b.createdAt || new Date());
            if (!isNaN(d)) {
                weeklyCounts[d.getDay()]++;
                monthlyCounts[d.getMonth()]++;
                quarterlyCounts[Math.floor(d.getMonth() / 3)]++;
            }
        });
    }

    const datasets = {
        weekly: [
            { label: "MON", value: weeklyCounts[1] },
            { label: "TUE", value: weeklyCounts[2] },
            { label: "WED", value: weeklyCounts[3] },
            { label: "THU", value: weeklyCounts[4] },
            { label: "FRI", value: weeklyCounts[5] },
            { label: "SAT", value: weeklyCounts[6] },
            { label: "SUN", value: weeklyCounts[0] }
        ],
        monthly: [
            { label: "JAN", value: monthlyCounts[0] },
            { label: "FEB", value: monthlyCounts[1] },
            { label: "MAR", value: monthlyCounts[2] },
            { label: "APR", value: monthlyCounts[3] },
            { label: "MAY", value: monthlyCounts[4] },
            { label: "JUN", value: monthlyCounts[5] },
            { label: "JUL", value: monthlyCounts[6] },
            { label: "AUG", value: monthlyCounts[7] },
            { label: "SEP", value: monthlyCounts[8] },
            { label: "OCT", value: monthlyCounts[9] },
            { label: "NOV", value: monthlyCounts[10] },
            { label: "DEC", value: monthlyCounts[11] }
        ],
        quarterly: [
            { label: "Q1", value: quarterlyCounts[0] },
            { label: "Q2", value: quarterlyCounts[1] },
            { label: "Q3", value: quarterlyCounts[2] },
            { label: "Q4", value: quarterlyCounts[3] }
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