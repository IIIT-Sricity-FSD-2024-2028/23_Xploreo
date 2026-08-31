import { getStatsHTML } from './stats.js';
import { getLedgerHTML } from './ledger.js';
import { getRevenueHTML } from './revenue.js';
import { getDisputesHTML } from './disputes.js';
import { getModalsHTML } from './modals.js';

export function getOperationsHTML() {
    return `
        <div class="page-header">
            <h1 class="page-title" style="margin-top: 0; font-size: 24px;">Operations Hub</h1>
            <p class="page-subtitle" style="margin: 5px 0 0; font-size: 14px;">Global real-time booking intelligence and lifecycle management.</p>
        </div>
        
        ${getStatsHTML()}
        ${getLedgerHTML()}
        ${getRevenueHTML()}
        ${getDisputesHTML()}
        ${getModalsHTML()}
    `;
}