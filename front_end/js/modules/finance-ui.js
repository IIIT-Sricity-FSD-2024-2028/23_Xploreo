// front_end/js/modules/finance-ui.js

export function buildFinanceHTML(financeData, payoutData) {
    return `
        <div class="page-header" style="margin-bottom: 32px;">
            <h1 class="page-title" style="margin-top: 0; font-size: 28px; color: #1a202c; font-weight: 700;">
                Finance & Analytics Hub
            </h1>
            <p class="page-subtitle" style="margin: 8px 0 0; font-size: 15px; color: #4a5568; line-height: 1.5;">
                Monitor your platform's financial health, manage partner commissions, and generate detailed performance reports.
            </p>
        </div>
        
        <div id="finance-content" style="display: flex; flex-direction: column; gap: 24px;">
            
            <div id="finance-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
                ${financeData.map(stat => `
                    <div class="stat-card ${stat.color}">
                        <div class="card-icon">
                            <img src="${stat.icon}" alt="icon">
                        </div>
                        <p class="stat-label">${stat.label}</p>
                        <h2 class="stat-value">${stat.value}</h2>
                        <p class="stat-subtext ${stat.subClass || ""}">${stat.subtext}</p>
                    </div>
                `).join('')}
            </div>

            <div style="background: #fff; border-radius: 20px; border: 1px solid #edf2f7; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                    <div>
                        <h3 style="margin: 0; font-size: 20px; color: #1a202c; font-weight: 700;">Earnings Performance</h3>
                        <p style="margin: 6px 0 0; font-size: 14px; color: #718096;">Daily gross revenue across all travel categories</p>
                    </div>
                    <div style="display: flex; background: #f7fafc; padding: 4px; border-radius: 10px; gap: 4px;">
                        <button data-period="weekly" class="chart-toggle-btn" style="border: none; background: transparent; padding: 8px 16px; font-size: 13px; color: #718096; cursor: pointer; border-radius: 8px; font-weight: 600; transition: all 0.2s;">Weekly</button>
                        <button data-period="monthly" class="chart-toggle-btn" style="border: none; background: #fff; padding: 8px 16px; font-size: 13px; color: #2b6cb0; cursor: pointer; border-radius: 8px; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s;">Monthly</button>
                        <button data-period="yearly" class="chart-toggle-btn" style="border: none; background: transparent; padding: 8px 16px; font-size: 13px; color: #718096; cursor: pointer; border-radius: 8px; font-weight: 600; transition: all 0.2s;">Yearly</button>
                    </div>
                </div>
                <div id="chart-visual-area" style="position: relative; height: 320px; width: 100%;"></div>
            </div>

            <div style="background: #fff; border-radius: 20px; border: 1px solid #edf2f7; padding: 32px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="padding: 0 32px 24px 32px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0; font-size: 20px; color: #1a202c; font-weight: 700;">Payout Management Hub</h3>
                        <p style="margin: 6px 0 0; font-size: 14px; color: #718096;">Manage disbursements to global travel agencies and tour operators.</p>
                    </div>
                    <div style="display: flex; background: #f7fafc; padding: 4px; border-radius: 8px; border: 1px solid #edf2f7; gap: 4px;">
                        <button class="payout-filter-btn active" data-filter="all" style="border: none; background: #fff; padding: 6px 12px; font-size: 12px; color: #2b6cb0; cursor: pointer; border-radius: 6px; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s;">All</button>
                        <button class="payout-filter-btn" data-filter="paid" style="border: none; background: transparent; padding: 6px 12px; font-size: 12px; color: #718096; cursor: pointer; border-radius: 6px; font-weight: 600; transition: all 0.2s;">Paid</button>
                        <button class="payout-filter-btn" data-filter="pending" style="border: none; background: transparent; padding: 6px 12px; font-size: 12px; color: #718096; cursor: pointer; border-radius: 6px; font-weight: 600; transition: all 0.2s;">Pending</button>
                        <button class="payout-filter-btn" data-filter="failed" style="border: none; background: transparent; padding: 6px 12px; font-size: 12px; color: #718096; cursor: pointer; border-radius: 6px; font-weight: 600; transition: all 0.2s;">Failed</button>
                    </div>
                </div>

                <div style="width: 100%; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: #f7fafc; border-bottom: 1px solid #edf2f7; border-top: 1px solid #edf2f7; color: #4a5568; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                <th style="padding: 16px 32px;">Partner Agency</th>
                                <th style="padding: 16px 32px;">Amount</th>
                                <th style="padding: 16px 32px;">Status</th>
                                <th style="padding: 16px 32px;">Date</th>
                            </tr>
                        </thead>
                        
                        <tbody id="payout-table-body" style="font-size: 14px; background: #fcfcfc;">
                            ${payoutData.map(payout => {
                                // 1. Determine colors based on status
                                let statusBg, statusColor, dotColor, badgeText, avatarBg, avatarColor;
                                
                                if (payout.status === 'paid') {
                                    statusBg = '#e6fffa'; statusColor = '#234e52'; dotColor = '#319795'; badgeText = 'Paid';
                                    avatarBg = '#ebf8ff'; avatarColor = '#2b6cb0';
                                } else if (payout.status === 'pending') {
                                    statusBg = '#edf2f7'; statusColor = '#4a5568'; dotColor = '#a0aec0'; badgeText = 'Pending';
                                    avatarBg = '#ebf8ff'; avatarColor = '#2b6cb0';
                                } else {
                                    statusBg = '#fff5f5'; statusColor = '#9b2c2c'; dotColor = '#e53e3e'; badgeText = 'Failed';
                                    avatarBg = '#fff5f5'; avatarColor = '#c53030';
                                }

                                // 2. Return the dynamic row
                                return `
                                <tr class="payout-row" data-status="${payout.status}" style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 24px 32px;">
                                        <div style="display: flex; align-items: center; gap: 16px;">
                                            <div style="width: 44px; height: 44px; border-radius: 50%; background: ${avatarBg}; color: ${avatarColor}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;">${payout.initials}</div>
                                            <div>
                                                <div style="font-weight: 700; color: #2d3748; font-size: 15px;">${payout.name}</div>
                                                <div style="font-size: 12px; color: #a0aec0; margin-top: 4px; font-weight: 500;">ID: #${payout.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 24px 32px; font-weight: 800; color: #1a202c; font-size: 15px;">${payout.amount}</td>
                                    <td style="padding: 24px 32px;">
                                        <span style="background: ${statusBg}; color: ${statusColor}; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
                                            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${dotColor};"></span> ${badgeText}
                                        </span>
                                    </td>
                                    <td style="padding: 24px 32px; color: #718096; font-weight: 500;">${payout.date}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                        </table>
                </div>
            </div>

        </div>
    `;
}