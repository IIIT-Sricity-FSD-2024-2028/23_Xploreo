/**
 * Location Autocomplete Utility
 * Attaches a live-search dropdown to a text input.
 * 
 * @param {string} inputId - ID of the input element
 * @param {string[]} suggestions - Array of location suggestion strings
 * @param {Function} [onSelect] - Optional callback when a suggestion is selected
 */
export function attachLocationAutocomplete(inputId, suggestions, onSelect) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Create dropdown container
    const dropdownId = `${inputId}-autocomplete-dropdown`;
    let existing = document.getElementById(dropdownId);
    if (existing) existing.remove();

    const dropdown = document.createElement("div");
    dropdown.id = dropdownId;
    dropdown.className = "location-autocomplete-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.setAttribute("aria-label", "Location suggestions");

    // Position dropdown relative to input wrapper
    const wrapper = input.closest(".input-wrapper") || input.closest("label") || input.parentElement;
    wrapper.style.position = "relative";
    wrapper.appendChild(dropdown);

    let activeIndex = -1;
    let isOpen = false;

    function normalizeStr(str) {
        return String(str || "").toLowerCase().trim();
    }

    function getMatches(query) {
        const q = normalizeStr(query);
        // suggestions can be an array or a function returning an array (for dynamic cross-field filtering)
        const list = typeof suggestions === "function" ? suggestions() : suggestions;
        if (!q) return list.slice(0, 3);
        return list
            .filter(s => normalizeStr(s).includes(q))
            .slice(0, 3);
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return (
            text.slice(0, idx) +
            `<mark>${text.slice(idx, idx + query.length)}</mark>` +
            text.slice(idx + query.length)
        );
    }

    function renderDropdown(matches, query) {
        if (!matches.length) {
            closeDropdown();
            return;
        }

        dropdown.innerHTML = matches.map((suggestion, i) => `
            <div class="location-autocomplete-item ${i === activeIndex ? "highlighted" : ""}"
                 role="option"
                 data-index="${i}"
                 data-value="${suggestion.replace(/"/g, '&quot;')}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path>
                    <circle cx="12" cy="11" r="2.5"></circle>
                </svg>
                <span>${highlightMatch(suggestion, query)}</span>
            </div>
        `).join("");

        dropdown.style.display = "block";
        isOpen = true;

        // Bind click on items
        dropdown.querySelectorAll(".location-autocomplete-item").forEach(item => {
            item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                const val = item.dataset.value;
                selectSuggestion(val);
            });
        });
    }

    function closeDropdown() {
        dropdown.style.display = "none";
        dropdown.innerHTML = "";
        isOpen = false;
        activeIndex = -1;
    }

    function selectSuggestion(value) {
        input.value = value;
        closeDropdown();
        input.dispatchEvent(new Event("change", { bubbles: true }));
        if (typeof onSelect === "function") onSelect(value);
    }

    // Input events
    input.addEventListener("input", () => {
        activeIndex = -1;
        const matches = getMatches(input.value);
        renderDropdown(matches, input.value);
    });

    input.addEventListener("focus", () => {
        const matches = getMatches(input.value);
        renderDropdown(matches, input.value);
    });

    // Keyboard navigation
    input.addEventListener("keydown", (e) => {
        if (!isOpen) return;
        const items = dropdown.querySelectorAll(".location-autocomplete-item");
        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            items.forEach((el, i) => el.classList.toggle("highlighted", i === activeIndex));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            items.forEach((el, i) => el.classList.toggle("highlighted", i === activeIndex));
        } else if (e.key === "Enter") {
            if (activeIndex >= 0 && items[activeIndex]) {
                e.preventDefault();
                selectSuggestion(items[activeIndex].dataset.value);
            }
        } else if (e.key === "Escape") {
            closeDropdown();
        }
    });

    // Close on outside click
    document.addEventListener("mousedown", (e) => {
        if (!wrapper.contains(e.target)) {
            closeDropdown();
        }
    });
}

/**
 * Returns today's date as YYYY-MM-DD string
 */
export function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Returns tomorrow's date as YYYY-MM-DD string
 */
export function getTomorrowDateString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

/**
 * Sets the min attribute on a date input to today (or a given min date)
 */
export function setDateMin(inputId, minDate) {
    const el = document.getElementById(inputId);
    if (el) {
        el.min = minDate || getTodayDateString();
        // If current value is before min, clear it
        if (el.value && el.value < el.min) {
            el.value = "";
        }
    }
}

/**
 * Extract unique sorted location strings from an array of items.
 * Deduplicates: if both "Mumbai" and "Mumbai (BOM)" exist, keeps only "Mumbai (BOM)".
 * @param {Object[]} items
 * @param {string[]} fields - field names to extract from each item
 */
export function extractUniqueLocations(items, fields) {
    const set = new Set();
    (items || []).forEach(item => {
        fields.forEach(field => {
            const val = String(item[field] || "").trim();
            if (val) set.add(val);
        });
    });

    const all = [...set].sort();
    // Remove any plain city name that already has an airport-code variant
    // e.g. remove "Mumbai" if "Mumbai (BOM)" exists
    return all.filter(entry => {
        const hasBracket = entry.includes("(");
        if (hasBracket) return true; // always keep airport-code version
        // drop if there is another entry that starts with the same base name and has a bracket
        const base = entry.toLowerCase();
        return !all.some(other => other !== entry && other.toLowerCase().startsWith(base) && other.includes("("));
    });
}

/**
 * Extract unique flight origin locations (for the From field)
 */
export function extractFlightOrigins(flights) {
    return extractUniqueLocations(flights, ["origin"]);
}

/**
 * Extract unique flight destination locations (for the To field)
 */
export function extractFlightDestinations(flights) {
    return extractUniqueLocations(flights, ["destination"]);
}
