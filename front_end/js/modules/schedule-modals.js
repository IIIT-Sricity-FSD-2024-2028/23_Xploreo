// Modal management for Schedule page

let currentSlotState = { dayIdx: null, slotIdx: null };

export function initScheduleModals(scheduleData, onUpdateAvailability) {
    // These elements might not exist on pages other than schedule.html
    const saveSlotBtn = document.getElementById("saveSlotBtn");
    const saveBlockBtn = document.getElementById("saveBlockBtn");

    if (saveSlotBtn) {
        saveSlotBtn.onclick = () => {
            const start = document.getElementById("startTime").value;
            const end = document.getElementById("endTime").value;
            const { dayIdx, slotIdx } = currentSlotState;

            if (slotIdx !== null) {
                scheduleData.availability[dayIdx].slots[slotIdx] = { start, end };
            } else {
                scheduleData.availability[dayIdx].slots.push({ start, end });
            }

            localStorage.setItem("scheduleData", JSON.stringify(scheduleData));
            window.closePopup("slotModal");
            if (onUpdateAvailability) onUpdateAvailability();
        };
    }

    if (saveBlockBtn) {
        saveBlockBtn.onclick = () => {
            const range = document.getElementById("blockRange").value;
            const reason = document.getElementById("blockReason").value;

            if (range && reason) {
                scheduleData.blockedDates.push({ id: Date.now(), range, reason });
                localStorage.setItem("scheduleData", JSON.stringify(scheduleData));
                window.closePopup("blockDateModal");
                if (onUpdateAvailability) onUpdateAvailability();
                
                // Clear fields
                document.getElementById("blockRange").value = "";
                document.getElementById("blockReason").value = "";
            } else {
                alert("Please enter both range and reason.");
            }
        };
    }
}

window.openPopup = (id) => {
    const popup = document.getElementById(id);
    if (popup) popup.classList.add("active");
};

window.closePopup = (id) => {
    const popup = document.getElementById(id);
    if (popup) popup.classList.remove("active");
};

window.openSlotModal = (dayIdx, slotIdx = null) => {
    // Need scheduleData to be accessible, usually passed via a closure or stored in a module-local state
    // For now, assume scheduleData is global or passed to an init function
    const scheduleData = JSON.parse(localStorage.getItem("scheduleData"));
    if (!scheduleData) return;

    currentSlotState = { dayIdx, slotIdx };
    const modal = document.getElementById("slotModal");
    const title = document.getElementById("slotModalTitle");
    const start = document.getElementById("startTime");
    const end = document.getElementById("endTime");

    if (!modal || !title || !start || !end) return;

    const dayName = scheduleData.availability[dayIdx].day;
    title.innerText = slotIdx !== null ? `Edit ${dayName} Slot` : `Add ${dayName} Slot`;
    
    if (slotIdx !== null) {
        const slot = scheduleData.availability[dayIdx].slots[slotIdx];
        start.value = slot.start;
        end.value = slot.end;
    } else {
        start.value = "9:00 AM";
        end.value = "5:00 PM";
    }

    window.openPopup("slotModal");
};
