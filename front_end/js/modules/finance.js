import { chartData, financeStats, payoutData } from '../api/legacyData.js';
import { buildFinanceHTML } from './finance-ui.js';

export function initFinance() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // 2. Passed payoutData into the builder function!
    mainContainer.innerHTML = buildFinanceHTML(financeStats, payoutData);

    // =======================
    // 🔹 CHART RENDER LOGIC
    // =======================
    const renderChart = (period) => {
        const data = chartData[period];
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

        visualArea.innerHTML = `
            <div style="position: absolute; top: 30px; left: ${data.tooltipLeft}; transform: translateX(-50%); background: #fff; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); z-index: 10; min-width: 140px; border: 1px solid #f2f5f8; transition: all 0.3s ease;">
                <div style="font-size: 11px; color: #a0aec0; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.05em; text-transform: uppercase;">${data.tooltipDate}</div>
                <div style="font-size: 24px; color: #2b6cb0; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.02em;">${data.tooltipValue}</div>
                <div style="font-size: 13px; color: #38a169; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    ${data.tooltipGrowth}
                </div>
            </div>

            <svg width="100%" height="100%" viewBox="0 0 1000 280" preserveAspectRatio="none" style="overflow: visible;">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#3182ce" stop-opacity="0.25" />
                        <stop offset="100%" stop-color="#3182ce" stop-opacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                <path d="${data.pathD} L 1000 280 L 0 280 Z" fill="url(#chartGradient)" />
                <path d="${data.pathD}" fill="none" stroke="#2b6cb0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                
                <g transform="translate(${data.dotX}, ${data.dotY})">
                    <circle cx="0" cy="0" r="14" fill="#ebf8ff" opacity="0.6" filter="url(#glow)"/>
                    <circle cx="0" cy="0" r="6" fill="#ebf8ff" stroke="#2b6cb0" stroke-width="3" />
                    <circle cx="0" cy="0" r="2.5" fill="#2b6cb0" />
                </g>
            </svg>

            <div style="display: flex; justify-content: space-between; position: absolute; bottom: 0; left: 0; right: 0; padding: 0 10px; color: #a0aec0; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;">
                ${data.labels}
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
