export function getModalsHTML() {
    // 1. Fetch users from localStorage
    const usersStr = localStorage.getItem("users");
    let techAdminOptions = `<option disabled>No Tech Admins Found</option>`; // Fallback

    if (usersStr) {
        try {
            const users = JSON.parse(usersStr);
            // 2. Filter for only users with the role 'techadmin'
            const techAdmins = users.filter(user => user.role === 'techadmin');

            // 3. Create the <option> tags dynamically
            if (techAdmins.length > 0) {
                techAdminOptions = techAdmins.map(admin => 
                    `<option value="${admin.username}">${admin.name}</option>`
                ).join('');
            }
        } catch (e) {
            console.error("Error parsing users for dropdown:", e);
        }
    }

    // 4. Return the HTML, injecting our new dropdown options
    return `
        <div id="manage-queue-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="queue-modal-title">Manage Queue Workflow</h3>
                    <button class="close-btn" data-target="manage-queue-modal">&times;</button>
                </div>
                <div class="modal-body queue-default-state">
                    <p>Select a bulk action to apply to the current recovery queue.</p>
                    <div class="modal-actions">
                        <button id="btn-escalate-queue" class="btn btn-primary">Assign All to Escalation Team</button>
                        <button id="btn-process-queue" class="btn btn-secondary">Auto-Process Eligible Refunds</button>
                    </div>
                </div>
                <div class="modal-body success-state" style="display: none; text-align: center; padding: 10px 0 20px;">
                    <div style="font-size: 48px; color: #1e8e3e; margin-bottom: 12px; font-weight: bold;">✓</div>
                    <h3 style="margin: 0 0 8px 0; color: #1a202c; font-size: 20px;">Action Confirmed</h3>
                    <p class="success-message-text" style="margin: 0; color: #4a5568; font-size: 15px;"></p>
                </div>
            </div>
        </div>

        <div id="resolve-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="dynamic-title">Resolve Case</h3>
                    <button class="close-btn" data-target="resolve-modal">&times;</button>
                </div>
                <div class="modal-body form-state">
                    <div style="background: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                        <strong>Case ID:</strong> <span class="inject-case"></span><br>
                        <strong>Ref:</strong> <span class="inject-ref"></span><br>
                        <strong>Issue:</strong> <span class="inject-issue"></span>
                    </div>
                    <p>Select the final resolution outcome for this dispute.</p>
                    <select style="width: 100%; padding: 10px; margin-bottom: 16px; border-radius: 6px; border: 1px solid #cbd5e0;">
                        <option>Issue Full Refund to Traveler</option>
                        <option>Issue Partial Credit & Warning</option>
                        <option>Dismiss Claim (Insufficient Evidence)</option>
                    </select>
                    <button class="btn btn-primary btn-confirm-action" style="width: 100%;">Confirm Resolution</button>
                </div>
                <div class="modal-body success-state" style="display: none; text-align: center; padding: 10px 0 20px;">
                    <div style="font-size: 48px; color: #1e8e3e; margin-bottom: 12px; font-weight: bold;">✓</div>
                    <h3 style="margin: 0 0 8px 0; color: #1a202c; font-size: 20px;">Case Resolved</h3>
                    <p style="margin: 0; color: #4a5568; font-size: 15px;">The ledger has been updated and parties notified.</p>
                </div>
            </div>
        </div>

        <div id="escalate-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="dynamic-title">Manage Case <span class="inject-case"></span></h3>
                    <button class="close-btn" data-target="escalate-modal">&times;</button>
                </div>
                <div class="modal-body form-state">
                    <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                        <strong style="color: #c53030;">Case ID:</strong> <span class="inject-case"></span><br>
                        <strong>Ref:</strong> <span class="inject-ref"></span><br>
                        <strong>Issue:</strong> <span class="inject-issue"></span>
                    </div>
                    <p>Select the appropriate technical admin to review this escalation.</p>
                    
                    <select style="width: 100%; padding: 10px; margin-bottom: 16px; border-radius: 6px; border: 1px solid #cbd5e0;">
                        <option value="" disabled selected>Select Technical Admin...</option>
                        <optgroup label="Technical Admins">
                            ${techAdminOptions}
                        </optgroup>
                    </select>
                    <textarea placeholder="Brief reason for escalation..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e0; margin-bottom: 16px; resize: none; font-family: inherit; box-sizing: border-box;" rows="3"></textarea>
                    <button class="btn btn-outline btn-confirm-action" style="width: 100%;">Submit Escalation</button>
                </div>
                <div class="modal-body success-state" style="display: none; text-align: center; padding: 10px 0 20px;">
                    <div style="font-size: 48px; color: #1e8e3e; margin-bottom: 12px; font-weight: bold;">✓</div>
                    <h3 style="margin: 0 0 8px 0; color: #1a202c; font-size: 20px;">Case Escalated</h3>
                    <p style="margin: 0; color: #4a5568; font-size: 15px;">The ticket has been routed to the selected tech admin.</p>
                </div>
            </div>
        </div>
    `;
}