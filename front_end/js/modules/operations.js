import { getOperationsHTML } from './operationsTemplate.js';
import { attachOperationsEvents } from './operationsEvents.js';

export function initOperations() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // 1. Render the UI
    mainContainer.innerHTML = getOperationsHTML();
    
    // 2. Attach Event Listeners
    attachOperationsEvents();
}