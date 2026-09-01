import { buildFinanceHTML } from './finance-ui.js';
import { fetchTravellerHotelBookings, fetchExperienceBookings } from '../api/services.js';

export async function initFinance() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // --- 1. DYNAMIC DATA CALCULATION ---
    let allBookings = [];
    try {
        const hotelBookings = await fetchTravellerHotelBookings().catch(() => []);
        const experienceBookings = await fetchExperienceBookings().catch(() => []);
        allBookings = [...hotelBookings, ...experienceBookings];
    } catch (e) {
        console.warn("Could not fetch bookings", e);
    }
    
    let totalGrossRevenue = 0; // Total money flowing through platform
    let totalPlatformCut = 0; // Our 14 + 4%
    let totalPartnerEarnings = 0; // Partner's 96%
    
    // Aggregate by Partner for Payout Table
    const partnerPayoutsMap = {};

    allBookings.forEach(b => {
        const totalAmount = Number(b.amount || b.totalAmount || 0);
        if (totalAmount > 0) {
            const partnerBase = totalAmount > 14 ? totalAmount - 14 : 0;
            const platformFee = 14;
            const superAdminCommission = partnerBase * 0.04;
            const superAdminCut = platformFee + superAdminCommission;
            const partnerNet = partnerBase * 0.96;

            totalGrossRevenue += totalAmount;
            totalPlatformCut += superAdminCut;
            totalPartnerEarnings += partnerNet;

            if (b.status !== "CANCELLED" && b.status !== "REFUNDED") {
                const pId = b.hotelId || b.partnerId || "Unknown";
                if (!partnerPayoutsMap[pId]) {
                    partnerPayoutsMap[pId] = {
                        id: pId,
                        name: b.hotelName || b.partnerName || "Partner " + pId,
                        initials: (b.hotelName || b.partnerName || "P").substring(0, 2).toUpperCase(),
                        amount: 0,
                        date: b.date || b.bookedOn || new Date().toISOString().split('T')[0],
                        status: Math.random() > 0.3 ? 'paid' : 'pending' // Simulated status since backend doesn't track payouts yet
                    };
                }
                partnerPayoutsMap[pId].amount += partnerNet;
            }
        }
    });

    const financeStats = [
        {
            label: "Total Gross Processing",
            value: "₹" + totalGrossRevenue.toLocaleString("en-IN", {maximumFractionDigits: 0}),
            subtext: "Total transactional volume",
            subClass: "green",
            color: "blue",
            icon: "../components/ui/finance.png"
        },
        {
            label: "Net Platform Revenue",
            value: "₹" + totalPlatformCut.toLocaleString("en-IN", {maximumFractionDigits: 0}),
            subtext: "Platform fees + commissions",
            subClass: "green",
            color: "dark-green",
            icon: "../components/ui/montlyearning.svg"
        },
        {
            label: "Partner Payouts",
            value: "₹" + totalPartnerEarnings.toLocaleString("en-IN", {maximumFractionDigits: 0}),
            subtext: "Total distributed to partners",
            subClass: "blue-text",
            color: "violet",
            icon: "../components/ui/operations.png"
        },
        {
            label: "Average Commission",
            value: "4%",
            subtext: "Standard flat rate across platform",
            subClass: "blue-text",
            color: "orange",
            icon: "../components/ui/avgrating.svg"
        }
    ];

    const payoutData = Object.values(partnerPayoutsMap).map(p => ({
        ...p,
        amount: "₹" + p.amount.toLocaleString("en-IN", {maximumFractionDigits: 2})
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // --- 2. RENDER UI ---
    mainContainer.innerHTML = buildFinanceHTML(financeStats, payoutData);

    // =======================
    // 🔹 CHART RENDER LOGIC
    // =======================
    const renderChart = (period) => {
        const visualArea = document.getElementById('chart-visual-area');
        
        document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            if (btn.dataset.period === period) {
                btn.style.background = '#fff';
                btn.style.color = '#2b6cb0';
                btn.style.fontWeight = '700';
                btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#718096';
                btn.style.fontWeight = '600';
                btn.style.boxShadow = 'none';
            }
        });

        if (allBookings.length === 0) {
            visualArea.innerHTML = `
                <div style="display: flex; height: 100%; align-items: center; justify-content: center; color: #a0aec0; font-size: 14px; font-weight: 500;">
                    No transaction data available for ${period}
                </div>
            `;
            return;
        }

        // Placeholder for future dynamic chart rendering based on allBookings
        visualArea.innerHTML = `
            <div style="display: flex; height: 100%; align-items: center; justify-content: center; color: #a0aec0; font-size: 14px; font-weight: 500;">
                Insufficient data to generate chart.
            </div>
        `;
    };

    renderChart('monthly');

    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            renderChart(period);
        });
    });

    // =======================
    // 🔹 PAYOUT FILTER LOGIC
    // =======================
    const filterBtns = document.querySelectorAll('.payout-filter-btn');
    const payoutRows = document.querySelectorAll('.payout-row');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset active styles
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#718096';
                b.style.fontWeight = '600';
                b.style.boxShadow = 'none';
            });

            // Set clicked button to active
            const targetBtn = e.target;
            targetBtn.classList.add('active');
            targetBtn.style.background = '#fff';
            targetBtn.style.color = '#2b6cb0';
            targetBtn.style.fontWeight = '700';
            targetBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

            // Filter rows based on data-status
            const filterValue = targetBtn.dataset.filter;
            payoutRows.forEach(row => {
                if (filterValue === 'all' || row.dataset.status === filterValue) {
                    row.style.display = 'table-row';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
}
