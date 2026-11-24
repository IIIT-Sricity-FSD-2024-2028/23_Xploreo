import { getOperationsHTML }    from './operationsTemplate.js';
import { attachOperationsEvents } from './operationsEvents.js';
import { prefetchRefunds }        from './revenue.js';
import { prefetchOpsStats }       from './stats.js';
import { prefetchLedger }         from './ledger.js';

export async function initOperations() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // Fetch all data in parallel before rendering
    const [opsStats, ledgerItems, refundItems] = await Promise.all([
        prefetchOpsStats(),
        prefetchLedger(),
        prefetchRefunds()
    ]);

    // 1. Render with live data
    mainContainer.innerHTML = getOperationsHTML({ opsStats, ledgerItems, refundItems });

    // 2. Attach Event Listeners
    attachOperationsEvents();
}