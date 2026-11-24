export function attachOperationsEvents() {
    // --- 1. GENERIC MODAL LOGIC ---
    // Use Event Delegation to handle dynamic close buttons
    document.addEventListener('click', (e) => {
        // Handle Close Buttons
        if (e.target.matches('.close-btn')) {
            const targetModalId = e.target.getAttribute('data-target');
            document.getElementById(targetModalId)?.classList.remove('active');
        }
        
        // Handle Outside Overlay Clicks
        if (e.target.matches('.modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    // Generic Success Trigger
    const triggerSuccess = (modalElement, customMessage = null) => {
        const header = modalElement.querySelector('.modal-header');
        const defaultState = modalElement.querySelector('.queue-default-state, .form-state');
        const successState = modalElement.querySelector('.success-state');
        
        if (header) header.style.display = "none";
        if (defaultState) defaultState.style.display = "none";
        
        if (customMessage) {
            const msgEl = successState.querySelector('.success-message-text');
            if(msgEl) msgEl.innerText = customMessage;
        }

        successState.style.display = "block";
        
        setTimeout(() => {
            modalElement.classList.remove('active');
            // Reset modal after closing
            setTimeout(() => {
                if (header) header.style.display = "flex";
                if (defaultState) defaultState.style.display = "block";
                successState.style.display = "none";
            }, 300);
        }, 2000);
    };

    // --- 2. MANAGE QUEUE LOGIC ---
    document.addEventListener('click', (e) => {
        if (e.target.id === 'open-queue-btn') {
            e.preventDefault(); 
            document.getElementById('manage-queue-modal')?.classList.add('active');
        }
        if (e.target.id === 'btn-escalate-queue') {
            triggerSuccess(document.getElementById('manage-queue-modal'), "All pending cases escalated.");
        }
        if (e.target.id === 'btn-process-queue') {
            triggerSuccess(document.getElementById('manage-queue-modal'), "Eligible refunds auto-processed.");
        }
    });


    // --- 3. DYNAMIC RESOLVE & ESCALATE LOGIC ---
    let activeRowElement = null; 
    let activeCaseId = null; // We need to track the ID to delete it from the database

    const populateModal = (modalElement, btnElement) => {
        const caseId = btnElement.getAttribute('data-case');
        const ref = btnElement.getAttribute('data-ref');
        const issue = btnElement.getAttribute('data-issue');

        modalElement.querySelector('.dynamic-title').innerText = `Manage Case #${caseId}`;
        modalElement.querySelector('.inject-case').innerText = caseId;
        modalElement.querySelector('.inject-ref').innerText = ref;
        modalElement.querySelector('.inject-issue').innerText = issue;
    };

    // Event Delegation for dynamically generated table buttons
    document.addEventListener('click', (e) => {
        const resolveBtn = e.target.closest('.btn-resolve');
        const escalateBtn = e.target.closest('.btn-escalate');

        if (resolveBtn) {
            activeRowElement = resolveBtn.closest('tr');
            activeCaseId = resolveBtn.getAttribute('data-case'); // Capture the ID
            const resolveModal = document.getElementById('resolve-modal');
            populateModal(resolveModal, resolveBtn);
            resolveModal.classList.add('active');
        }

        if (escalateBtn) {
            activeRowElement = escalateBtn.closest('tr');
            activeCaseId = escalateBtn.getAttribute('data-case'); // Capture the ID
            const escalateModal = document.getElementById('escalate-modal');
            populateModal(escalateModal, escalateBtn);
            escalateModal.classList.add('active');
        }
    });


    // --- 4. PERSISTENT DATABASE UPDATES ---
    // Handle Confirm Buttons in Resolve/Escalate Modals
    const confirmButtons = document.querySelectorAll('.btn-confirm-action');
    confirmButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parentModal = e.target.closest('.modal-overlay');
            triggerSuccess(parentModal);

            if (activeRowElement && activeCaseId) {
                // 1. DELETE FROM DATABASE (LocalStorage)
                let storedDisputes = JSON.parse(localStorage.getItem('disputes')) || [];
                // Filter out the case we just resolved
                storedDisputes = storedDisputes.filter(dispute => dispute.caseId !== activeCaseId);
                // Save the new list back to storage
                localStorage.setItem('disputes', JSON.stringify(storedDisputes));

                // 2. DELETE FROM UI (Your smooth animations)
                activeRowElement.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                activeRowElement.style.opacity = "0";
                activeRowElement.style.transform = "translateX(20px)";
                
                setTimeout(() => {
                    activeRowElement.remove();
                    activeRowElement = null; 
                    activeCaseId = null;

                    const tbody = document.querySelector('.dispute-table tbody');
                    if (tbody && tbody.children.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: #718096; font-size: 14px;">All disputes resolved! 🎉</td></tr>`;
                    }
                }, 400);
            }
        });
    });
}