import { fetchExperiencePartnerBookings } from "../api/services.js";
import { earningsData } from "../api/legacyData.js";
import {
    formatCurrency,
    readStorage,
    setElementText
} from "./experience_shared.js";

export async function renderExperienceEarningsPage() {
    let rawBookings = [];
    try {
        rawBookings = await fetchExperiencePartnerBookings();
    } catch(e) {
        console.warn("Failed to fetch bookings for earnings", e);
    }
    
    let data = [];
    if (rawBookings && rawBookings.length > 0) {
        data = rawBookings.map(b => ({
           user: b.guestName || "Traveller",
           title: b.experience?.title || "Experience",
           amount: b.totalAmount || 0,
           date: b.date || b.createdAt || new Date().toISOString(),
           status: (b.status || "").toLowerCase() === "cancelled" ? "Refunded" : ((b.status || "").toLowerCase() === "confirmed" ? "Completed" : "Pending")
        }));
    } else {
        data = readStorage("experienceEarnings", earningsData);
    }

    const table = document.getElementById("earningsTable");
    const filter = document.getElementById("dateFilter");
    const statusFilter = document.getElementById("transactionStatusFilter");
    const refundBar = document.getElementById("refundBar");
    const refundTrendText = document.getElementById("refundTrendText");
    const refundNote = document.getElementById("refundNote");
    const refundNoteTitle = document.getElementById("refundNoteTitle");
    const refundNoteBody = document.getElementById("refundNoteBody");

    function getFilteredData(days) {
        const latestDate = new Date(Math.max(...data.map((item) => new Date(item.date))));

        return data.filter((item) => {
            const diff = (latestDate - new Date(item.date)) / (1000 * 60 * 60 * 24);
            return diff <= Number(days);
        });
    }

    function getMaxKey(obj) {
        const keys = Object.keys(obj);
        if (!keys.length) return "--";
        return keys.reduce((a, b) => obj[a] > obj[b] ? a : b);
    }

    function formatDisplayDate(value) {
        return new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function render(dataToRender) {
        if (!table) return;

        let total = 0;
        let refunded = 0;
        const bookingsCount = dataToRender.length;
        const expMap = {};
        const dayMap = {};
        let cancelled = 0;

        table.innerHTML = dataToRender.map((item) => {
            const rawAmt = Number(item.amount || 0);
            const partnerBase = rawAmt > 14 ? rawAmt - 14 : rawAmt;
            const partnerNet = partnerBase * 0.96;
            total += partnerNet;

            if (item.status === "Refunded") {
                refunded += partnerNet;
                cancelled += 1;
            }

            expMap[item.title] = (expMap[item.title] || 0) + partnerNet;
            const day = new Date(item.date).toLocaleDateString("en-US", { weekday: "long" });
            dayMap[day] = (dayMap[day] || 0) + 1;

            return `
                <tr>
                    <td>${item.user}</td>
                    <td>${item.title}</td>
                    <td>${formatCurrency(partnerNet)}</td>
                    <td>${formatDisplayDate(item.date)}</td>
                    <td><span class="status-pill ${item.status === "Refunded" ? "cancelled" : "checked"}">${item.status}</span></td>
                </tr>
            `;
        }).join("");

        setElementText("totalRevenue", formatCurrency(total));
        setElementText("totalRevenueText", formatCurrency(total));
        setElementText("earnings", formatCurrency(total - refunded));
        setElementText("refundAmount", formatCurrency(refunded));
        setElementText("avgBooking", bookingsCount ? formatCurrency(Math.round(total / bookingsCount)) : "₹0");
        setElementText("topExperience", getMaxKey(expMap));
        setElementText("bestDay", getMaxKey(dayMap));
        setElementText("utilization", bookingsCount ? `${Math.min(100, bookingsCount * 10)}%` : "0%");
        setElementText("cancelRate", bookingsCount ? `${((cancelled / bookingsCount) * 100).toFixed(1)}%` : "0%");
        
        // Dynamically compute simple trends or placeholders
        setElementText("totalRevenueTrend", "--");
        setElementText("earningsTrend", "--");
        setElementText("refundTrend", "--");
        setElementText("avgBookingTrend", "--");

        const refundPercent = total ? ((refunded / total) * 100).toFixed(1) : "0.0";
        setElementText("refundAmountBig", formatCurrency(refunded));
        setElementText("refundPercent", `${refundPercent}%`);
        setElementText("refundRateText", `${refundPercent}%`);

        const revenueSources = document.getElementById("revenueSources");
        if (revenueSources) {
            revenueSources.innerHTML = Object.entries(expMap).map(([name, amount], index) => {
                const percent = total ? ((amount / total) * 100).toFixed(0) : 0;
                const colorClass = index === 0 ? "blue" : "green";

                return `
                    <article class="source-item">
                        <div class="source-top">
                            <div class="source-label">
                                <div class="dot ${colorClass}"></div>
                                <span>${name}</span>
                            </div>
                            <div class="source-metrics">
                                <span class="amount">${formatCurrency(amount)}</span>
                                <span class="percent">${percent}%</span>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${colorClass}" style="width:${percent}%"></div>
                        </div>
                    </article>
                `;
            }).join("");
        }

        if (refundBar) {
            refundBar.style.width = `${refundPercent}%`;
        }

        if (refundTrendText) {
            const numericRefund = Number(refundPercent);
            const trendValue = Math.abs(numericRefund - 5).toFixed(1);
            const sign = numericRefund > 5 ? "+" : "-";
            refundTrendText.textContent = `${sign}${trendValue}% vs industry benchmark`;
        }

        if (refundNoteTitle && refundNoteBody && refundNote) {
            const numericRefund = Number(refundPercent);

            if (numericRefund > 5) {
                refundNote.classList.remove("good");
                refundNoteTitle.textContent = "Refund Rate Above Target";
                refundNoteBody.textContent = "Your refund rate is above the typical benchmark. Review cancellation and expectation-setting.";
            } else {
                refundNote.classList.add("good");
                refundNoteTitle.textContent = "Low Refund Rate";
                refundNoteBody.textContent = "Your refund rate is below industry average (5%).";
            }
        }
    }

    const getStatusFilteredData = (items, status) => {
        if (!status || status === "all") {
            return items;
        }

        return items.filter((item) => item.status === status);
    };

    const update = () => {
        const dateFiltered = getFilteredData(filter?.value || 30);
        const filtered = getStatusFilteredData(dateFiltered, statusFilter?.value || "all");
        render(filtered.length ? filtered : data);
    };

    if (filter) {
        filter.onchange = update;
    }

    if (statusFilter) {
        statusFilter.onchange = update;
    }

    update();
}
