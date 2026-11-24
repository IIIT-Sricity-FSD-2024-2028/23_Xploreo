// Calendar-specific logic for Schedule Management

export function renderCalendarView(container, state, scheduleData, reRender) {
    const monthYear = state.calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    container.innerHTML = `
        <div class="calendar-container">
            <div class="calendar-main">
                <div class="calendar-header">
                    <h2 class="calendar-title">${monthYear}</h2>
                    <div class="calendar-nav">
                        <button class="nav-btn" id="prevMonth">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button class="today-btn" id="goToday">Today</button>
                        <button class="nav-btn" id="nextMonth">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
                <div class="calendar-grid" id="calendarGrid"></div>
                <div class="calendar-legend">
                    <div class="legend-item"><span class="dot confirmed"></span> Confirmed</div>
                    <div class="legend-item"><span class="dot pending"></span> Pending</div>
                    <div class="legend-item"><span class="dot today"></span> Today</div>
                </div>
            </div>
            <div class="day-details-panel" id="dayDetails">
                <!-- Day details rendered here -->
            </div>
        </div>
    `;

    renderCalendarGrid(state, scheduleData, reRender);
    const allTours = JSON.parse(localStorage.getItem("tours")) || [];
    renderDayDetails(state.selectedDate, allTours, state.currentUser);

    // Event Listeners
    document.getElementById("prevMonth").onclick = () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
        reRender();
    };
    document.getElementById("nextMonth").onclick = () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
        reRender();
    };
    document.getElementById("goToday").onclick = () => {
        state.calendarDate = new Date();
        state.selectedDate = new Date();
        reRender();
    };
}

export function renderCalendarGrid(state, scheduleData, reRender) {
    const grid = document.getElementById("calendarGrid");
    if (!grid) return;

    grid.innerHTML = "";

    // Day labels
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
        const label = document.createElement("div");
        label.className = "day-label";
        label.innerText = day;
        grid.appendChild(label);
    });

    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Previous month filler
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = createDayCell(prevMonthLastDay - i, true, false, false, null, state, scheduleData, reRender);
        grid.appendChild(cell);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(year, month, i);
        const isToday = dateObj.toDateString() === today.toDateString();
        const isSelected = dateObj.toDateString() === state.selectedDate.toDateString();
        
        const cell = createDayCell(i, false, isToday, isSelected, dateObj, state, scheduleData, reRender);
        grid.appendChild(cell);
    }
}

function createDayCell(num, isOtherMonth, isToday, isSelected, dateObj, state, scheduleData, reRender) {
    const cell = document.createElement("div");
    cell.className = `day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
    
    cell.innerHTML = `<span class="day-number">${num}</span>`;

    if (!isOtherMonth && dateObj) {
        const padLocal = (num) => String(num).padStart(2, '0');
        const dateStr = `${dateObj.getFullYear()}-${padLocal(dateObj.getMonth() + 1)}-${padLocal(dateObj.getDate())}`;
        // Fetch tours from localStorage for real-time accuracy
        const allTours = JSON.parse(localStorage.getItem("tours")) || [];
        const dayEvents = allTours.filter(t => 
            t.dateTime && 
            t.dateTime.includes(dateStr) && 
            String(t.guideId) === String(state.currentUser.id)
        );
        
        dayEvents.forEach(evt => {
            const ind = document.createElement("div");
            ind.className = `event-indicator ${evt.status}`;
            ind.title = evt.title;
            ind.innerHTML = `
                <span style="font-weight: 700;">${evt.status === 'confirmed' ? '●' : '○'}</span>
                <span>${evt.title.split(' ')[0]}</span>
            `;
            ind.onclick = (e) => {
                e.stopPropagation(); // Don't trigger day selection
                if (window.openTourModal) {
                    window.openTourModal(evt.id);
                }
            };
            cell.appendChild(ind);
        });

        cell.onclick = () => {
            state.selectedDate = dateObj;
            document.querySelectorAll(".day-cell").forEach(c => c.classList.remove("selected"));
            cell.classList.add("selected");
            const allTours = JSON.parse(localStorage.getItem("tours")) || [];
            renderDayDetails(dateObj, allTours, state.currentUser);
        };
    }

    return cell;
}

export function renderDayDetails(date, allTours, currentUser) {
    const panel = document.getElementById("dayDetails");
    if (!panel) return;

    const dateStr = date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
    const padLocal = (num) => String(num).padStart(2, '0');
    const isoDate = `${date.getFullYear()}-${padLocal(date.getMonth() + 1)}-${padLocal(date.getDate())}`;
    
    const dayEvents = allTours.filter(t => 
        t.dateTime && 
        t.dateTime.includes(isoDate) && 
        String(t.guideId) === String(currentUser.id)
    );

    panel.innerHTML = `
        <h3 class="details-date">${dateStr}</h3>
        <div class="details-content">
            ${dayEvents.length > 0 ? 
                dayEvents.map(evt => {
                    const time = evt.dateTime.split(" | ")[1] || "";
                    return `
                        <div class="event-card ${evt.status}">
                            <div class="event-header">
                                <span class="event-title">${evt.title}</span>
                                <span class="event-status-pill ${evt.status}">${evt.status.charAt(0).toUpperCase() + evt.status.slice(1)}</span>
                            </div>
                            <div class="event-meta">
                                <div class="event-time">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    <span>${time}</span>
                                </div>
                                <div class="event-location" style="display: flex; align-items: center; gap: 4px; font-size: 11px; opacity: 0.7; margin-top: 4px;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                    <span>${evt.location}</span>
                                </div>
                            </div>
                            <button class="view-details-btn" onclick="window.openTourModal && window.openTourModal('${evt.id}')">View Details</button>
                        </div>
                    `;
                }).join('') : 
                `<div class="empty-details">No tours scheduled for this day.</div>`
            }
        </div>
    `;
}
