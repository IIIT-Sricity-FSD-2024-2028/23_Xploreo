// Availability-specific logic for Schedule Management

export function renderAvailabilityView(container, scheduleData, reRender) {
    const activeDaysCount = scheduleData.availability.filter(d => d.active).length;
    const totalHours = scheduleData.availability.reduce((acc, curr) => {
        if (!curr.active) return acc;
        return acc + curr.slots.length * 8; 
    }, 0);
    const availableSlots = scheduleData.availability.reduce((acc, curr) => acc + curr.slots.length, 0);

    container.innerHTML = `
        <div class="availability-container">
            <div class="availability-stats">
                <div class="stat-card">
                    <span class="stat-label">Active Days</span>
                    <span class="stat-value">${activeDaysCount}</span>
                    <span class="stat-sub">days per week</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Total Hours</span>
                    <span class="stat-value">${totalHours}</span>
                    <span class="stat-sub">hours per week</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Available Slots</span>
                    <span class="stat-value">${availableSlots}</span>
                    <span class="stat-sub">time slots this week</span>
                </div>
            </div>

            <div class="weekly-schedule-card">
                <div class="section-title">
                    <span>Weekly Schedule</span>
                    <button class="apply-btn">Apply to Next 4 Weeks</button>
                </div>
                <div class="weekly-list" id="weeklyList"></div>
            </div>

            <div class="blocked-dates-card">
                <div class="section-title">Block Specific Dates</div>
                <div class="blocked-list" id="blockedList"></div>
                <button class="add-blocked-full-btn">+ Add Blocked Dates</button>
            </div>

            <div class="schedule-footer">
                <button class="cancel-btn">Cancel</button>
                <button class="save-btn" id="saveSchedule">Save Changes</button>
            </div>
        </div>
    `;

    renderWeeklyList(scheduleData, reRender);
    renderBlockedList(scheduleData);

    const saveBtn = document.getElementById("saveSchedule");
    if (saveBtn) {
        saveBtn.onclick = () => {
            localStorage.setItem("scheduleData", JSON.stringify(scheduleData));
            alert("Schedule changes saved successfully!");
            renderAvailabilityView(container, scheduleData, reRender);
        };
    }
}

export function renderWeeklyList(scheduleData, reRender) {
    const list = document.getElementById("weeklyList");
    if (!list) return;

    list.innerHTML = scheduleData.availability.map((day, idx) => `
        <div class="day-row ${day.active ? '' : 'inactive'}" data-idx="${idx}">
            <div class="day-row-header">
                <div class="day-name-group">
                    <label class="switch">
                        <input type="checkbox" ${day.active ? 'checked' : ''} class="day-toggle">
                        <span class="slider"></span>
                    </label>
                    <span class="day-name">${day.day}</span>
                    ${!day.active ? '<span class="unavailable-label">Unavailable</span>' : ''}
                </div>
                ${day.active ? `<button class="add-slot-btn" data-idx="${idx}">+ Add Slot</button>` : ''}
            </div>
            ${day.active ? `
                <div class="slots-container">
                    ${day.slots.map((slot, sIdx) => `
                        <div class="slot-item" style="cursor: pointer;" onclick="window.openSlotModal && window.openSlotModal(${idx}, ${sIdx})">
                            <span>${slot.start} to ${slot.end}</span>
                            <span class="remove-slot" data-day="${idx}" data-slot="${sIdx}" onclick="event.stopPropagation()">×</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');

    // Day Toggle Listeners
    document.querySelectorAll(".day-toggle").forEach(el => {
        el.onchange = (e) => {
            const idx = parseInt(e.target.closest(".day-row").dataset.idx);
            scheduleData.availability[idx].active = e.target.checked;
            
            if (e.target.checked && scheduleData.availability[idx].slots.length === 0) {
                if (window.openSlotModal) window.openSlotModal(idx);
            } else {
                renderWeeklyList(scheduleData, reRender);
            }
        };
    });

    // Remove Slot Listeners
    document.querySelectorAll(".remove-slot").forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const dayIdx = e.target.dataset.day;
            const slotIdx = e.target.dataset.slot;
            scheduleData.availability[dayIdx].slots.splice(slotIdx, 1);
            localStorage.setItem("scheduleData", JSON.stringify(scheduleData));
            renderWeeklyList(scheduleData, reRender);
        };
    });

    // Add Slot Listeners
    document.querySelectorAll(".add-slot-btn").forEach(el => {
        el.onclick = (e) => {
            const idx = parseInt(e.target.dataset.idx);
            if (window.openSlotModal) window.openSlotModal(idx);
        };
    });
}

export function renderBlockedList(scheduleData) {
    const list = document.getElementById("blockedList");
    if (!list) return;

    list.innerHTML = scheduleData.blockedDates.map((block, idx) => `
        <div class="blocked-item">
            <div class="blocked-content">
                <span class="blocked-range">${block.range}</span>
                <span class="blocked-reason">${block.reason}</span>
            </div>
            <button class="remove-blocked" data-idx="${idx}">×</button>
        </div>
    `).join('');

    document.querySelectorAll(".remove-blocked").forEach(el => {
        el.onclick = (e) => {
            const idx = e.target.dataset.idx;
            scheduleData.blockedDates.splice(idx, 1);
            localStorage.setItem("scheduleData", JSON.stringify(scheduleData));
            renderBlockedList(scheduleData);
        };
    });

    const addBtn = document.querySelector(".add-blocked-full-btn");
    if (addBtn) {
        addBtn.onclick = () => window.openPopup && window.openPopup("blockDateModal");
    }
}
