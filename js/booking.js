/**
 * booking.js — Mama Oliech Restaurant
 * Loaded on: index.html (reservation form) and dashboard.html (admin panel)
 *
 * Responsibilities:
 *  1. Constants & configuration
 *  2. LocalStorage helpers  — read / write / clear
 *  3. Seed data             — Obama, Zuckerberg, Elba + Kezia demo rows
 *  4. Validation helpers    — phone, date, guest count
 *  5. WhatsApp deeplink     — buildWhatsAppUrl()
 *  6. Form submission       — #resForm handler
 *  7. Dashboard renderer    — renderDashboard()
 *  8. Status & delete       — updateBookingStatus() / deleteBooking()
 *  9. HTML escaping         — escapeHtml()
 */

'use strict';

/* ═════════════════════════════════════════════════════════════════════════════
   1. CONSTANTS
═════════════════════════════════════════════════════════════════════════════ */

/** LocalStorage key — one place to change if we ever rename it. */
const STORAGE_KEY = 'mama_oliech_reservations';

/** WhatsApp number in international format without + or spaces. */
const WA_NUMBER = '254723925604';

/** Valid booking statuses in workflow order. */
const STATUSES = /** @type {const} */ (['pending', 'confirmed', 'completed']);

/* ═════════════════════════════════════════════════════════════════════════════
   2. LOCALSTORAGE HELPERS
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Read the full reservations array from LocalStorage.
 * Returns the seed data (and persists it) if the key doesn't exist yet.
 * Guards against corrupt JSON so a bad localStorage entry never crashes the page.
 *
 * @returns {Reservation[]}
 */
function getReservationsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        // First visit — write seed data so the dashboard is not empty.
        const seed = buildSeedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }

    try {
        const parsed = JSON.parse(raw);
        // Guard: must be an array; if corrupted fall back to seed.
        if (!Array.isArray(parsed)) throw new Error('Not an array');
        return parsed;
    } catch (_) {
        console.warn('[booking.js] LocalStorage data was corrupted — resetting to seed.');
        const seed = buildSeedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
}

/**
 * Persist a single new reservation by appending it to the existing array.
 * @param {Reservation} reservation
 */
function saveReservationToStorage(reservation) {
    const existing = getReservationsFromStorage();
    existing.push(reservation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Overwrite the entire reservations array.
 * Used after status updates and deletes.
 * @param {Reservation[]} reservations
 */
function saveAllReservationsToStorage(reservations) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

/* ═════════════════════════════════════════════════════════════════════════════
   3. SEED DATA
   Three famous-guest rows (Obama / Zuckerberg / Elba) plus a local family row.
   Timestamps are relative to "now" so they always look recent when the page
   loads for the first time on any device.
═════════════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {{
 *   id:        string,
 *   timestamp: string,
 *   status:    'pending'|'confirmed'|'completed',
 *   name:      string,
 *   phone:     string,
 *   size:      string,
 *   date:      string,
 *   time:      string,
 *   requests:  string
 * }} Reservation
 */

/**
 * Build relative-date seed rows so the demo always looks fresh.
 * @returns {Reservation[]}
 */
function buildSeedData() {
    const now      = Date.now();
    const DAY_MS   = 86_400_000;

    /** Format a Date as YYYY-MM-DD in local time (avoids UTC off-by-one). */
    const localDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return [
        {
            id:        'BK-OBAMA0001',
            timestamp: new Date(now - DAY_MS * 3).toISOString(),
            status:    'completed',
            name:      'Barack Obama',
            phone:     '+1 202 456 1111',
            size:      '6',
            date:      localDate(new Date(now - DAY_MS * 3)),
            time:      '12:30',
            requests:  'State visit. Full security detail accompanying. Whole fried tilapia and ugali for the table. Private corner area requested.'
        },
        {
            id:        'BK-ZUCK0002',
            timestamp: new Date(now - DAY_MS * 1).toISOString(),
            status:    'completed',
            name:      'Mark Zuckerberg',
            phone:     '+1 650 555 0199',
            size:      '4',
            date:      localDate(new Date(now - DAY_MS * 1)),
            time:      '13:00',
            requests:  'The Zuckerberg Special for the table. Needs secure corner seat away from windows. Extra ugali on the side.'
        },
        {
            id:        'BK-ELBA0003',
            timestamp: new Date(now - DAY_MS * 0.2).toISOString(),
            status:    'confirmed',
            name:      'Idris Elba',
            phone:     '+44 20 7946 0958',
            size:      '2',
            date:      localDate(new Date(now)),
            time:      '20:00',
            requests:  'Prefers quiet seating. Extra large tilapia dry fry. Fresh kachumbari on the side. Allergic to shellfish.'
        },
        {
            id:        'BK-KEZIA004',
            timestamp: new Date(now + DAY_MS * 0.5).toISOString(),
            status:    'pending',
            name:      'Kezia Oliech',
            phone:     '+254 712 345 678',
            size:      '8',
            date:      localDate(new Date(now + DAY_MS * 1)),
            time:      '19:30',
            requests:  'Family reunion dinner. Traditional managu and sukuma wiki sides are a must. Birthday cake will be brought by family.'
        }
    ];
}

/* ═════════════════════════════════════════════════════════════════════════════
   4. VALIDATION HELPERS
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Very light phone check — at least 7 digits somewhere in the string.
 * Accepts +254 700 000000, (020) 555-1234, etc.
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    return /\d{7,}/.test(phone.replace(/[\s\-().+]/g, ''));
}

/**
 * Date must be today or in the future.
 * Compares YYYY-MM-DD strings in local time to avoid UTC shift bugs.
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {boolean}
 */
function isDateValid(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    const todayStr = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-');
    return dateStr >= todayStr;
}

/**
 * Guest count must be a positive integer between 1 and 500.
 * @param {string|number} size
 * @returns {boolean}
 */
function isValidSize(size) {
    const n = parseInt(size, 10);
    return !isNaN(n) && n >= 1 && n <= 500;
}

/**
 * Show an inline error message below a form field.
 * Creates/reuses a <span class="field-error"> element.
 * @param {HTMLElement} field
 * @param {string}      message
 */
function showFieldError(field, message) {
    let err = field.parentElement.querySelector('.field-error');
    if (!err) {
        err = document.createElement('span');
        err.className = 'field-error';
        err.style.cssText = 'color:#ba1a1a;font-size:0.8rem;margin-top:0.25rem;display:block;';
        field.parentElement.appendChild(err);
    }
    err.textContent = message;
    field.style.borderColor = '#ba1a1a';
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', err.id || (err.id = 'err-' + field.name));
}

/**
 * Clear the inline error on a field.
 * @param {HTMLElement} field
 */
function clearFieldError(field) {
    const err = field.parentElement.querySelector('.field-error');
    if (err) err.textContent = '';
    field.style.borderColor = '';
    field.removeAttribute('aria-invalid');
}

/* ═════════════════════════════════════════════════════════════════════════════
   5. WHATSAPP DEEPLINK BUILDER
   Builds a wa.me URL with a pre-filled, human-readable message.
   Uses encodeURIComponent so all special characters (& * # etc.) are safe.
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Build a WhatsApp deeplink for a reservation.
 * @param {Reservation} res
 * @returns {string}  Full wa.me URL
 */
function buildWhatsAppUrl(res) {
    // Format the date into a readable string (e.g. "Tue, Jun 24, 2026").
    // We append T00:00 to parse as local time, not UTC midnight.
    const dateDisplay = new Date(res.date + 'T00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
    });

    const lines = [
        '🐟 *Mama Oliech Restaurant — Table Reservation*',
        '',
        `*Booking ID:*  ${res.id}`,
        `*Name:*        ${res.name}`,
        `*Phone:*       ${res.phone}`,
        `*Guests:*      ${res.size} ${Number(res.size) === 1 ? 'person' : 'people'}`,
        `*Date:*        ${dateDisplay}`,
        `*Time:*        ${res.time}`,
        `*Requests:*    ${res.requests || 'None'}`,
        '',
        '_Sent via mamaoliech.com reservation form_',
    ];

    const message = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${WA_NUMBER}?text=${message}`;
}

/* ═════════════════════════════════════════════════════════════════════════════
   6. FORM SUBMISSION HANDLER
   Runs on index.html where <form id="resForm"> exists.
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Wire up the reservation form if it exists on the current page.
 */
function initReservationForm() {
    const form = document.getElementById('resForm');
    if (!form) return;

    // Set today as the minimum selectable date.
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        const today = new Date();
        dateInput.min = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
        ].join('-');
    }

    // Clear inline errors on user input.
    form.querySelectorAll('input, textarea').forEach(field => {
        field.addEventListener('input', () => clearFieldError(field));
    });

    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Form submit handler — validates, saves, opens WhatsApp, resets.
 * @param {SubmitEvent} e
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // ── Client-side validation ───────────────────────────────────────────────
    let hasError = false;

    const nameField = form.querySelector('input[name="name"]');
    if (!data.name || data.name.trim().length < 2) {
        showFieldError(nameField, 'Please enter your full name (at least 2 characters).');
        hasError = true;
    }

    const phoneField = form.querySelector('input[name="phone"]');
    if (!isValidPhone(data.phone || '')) {
        showFieldError(phoneField, 'Please enter a valid phone number (e.g. +254 700 000000).');
        hasError = true;
    }

    const sizeField = form.querySelector('input[name="size"]');
    if (!isValidSize(data.size)) {
        showFieldError(sizeField, 'Guest count must be between 1 and 500.');
        hasError = true;
    }

    const dateField = form.querySelector('input[name="date"]');
    if (!isDateValid(data.date)) {
        showFieldError(dateField, 'Please select today or a future date.');
        hasError = true;
    }

    const timeField = form.querySelector('input[name="time"]');
    if (!data.time) {
        showFieldError(timeField, 'Please select a preferred arrival time.');
        hasError = true;
    }

    if (hasError) {
        // Scroll to the first error field.
        const firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) firstError.focus();
        return;
    }

    // ── Build and persist the reservation object ─────────────────────────────
    const reservation = {
        id:        'BK-' + Date.now(),
        timestamp: new Date().toISOString(),
        status:    'pending',
        name:      data.name.trim(),
        phone:     data.phone.trim(),
        size:      String(parseInt(data.size, 10)),
        date:      data.date,
        time:      data.time,
        requests:  (data.requests || '').trim() || 'None',
    };

    saveReservationToStorage(reservation);

    // ── Open WhatsApp deeplink BEFORE the alert ───────────────────────────────
    // Browsers block window.open() if it's called after an alert() because the
    // alert suspends the call stack and the browser treats the open as
    // non-user-initiated. Opening first keeps it within the click event.
    const waUrl = buildWhatsAppUrl(reservation);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // ── Reset form and show success state ────────────────────────────────────
    form.reset();

    // Replace the submit button text briefly as visual feedback.
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        const original = submitBtn.textContent;
        submitBtn.textContent = '✓ Reservation sent!';
        submitBtn.disabled = true;
        submitBtn.style.backgroundColor = 'var(--brand-green)';
        setTimeout(() => {
            submitBtn.textContent = original;
            submitBtn.disabled = false;
            submitBtn.style.backgroundColor = '';
        }, 4000);
    }
}

/* ═════════════════════════════════════════════════════════════════════════════
   7. DASHBOARD RENDERER
   Runs on dashboard.html where <tbody id="dashboard-body"> exists.
   Handles: initial render, live search, status filter, stat counters.
═════════════════════════════════════════════════════════════════════════════ */

/** Cache DOM references so we don't query on every re-render. */
let _dashboardRefs = null;

function getDashboardRefs() {
    if (_dashboardRefs) return _dashboardRefs;
    _dashboardRefs = {
        tbody:        document.getElementById('dashboard-body'),
        totalCount:   document.getElementById('total-bookings'),
        totalGuests:  document.getElementById('total-guests'),
        pendingCount: document.getElementById('pending-bookings'),
        searchInput:  document.getElementById('search-booking'),
        statusFilter: document.getElementById('filter-status'),
    };
    return _dashboardRefs;
}

/**
 * Full dashboard render.
 * Reads from storage, applies current filter/search, updates stat cards,
 * and rebuilds the table body.
 */
function renderDashboard() {
    const refs = getDashboardRefs();
    if (!refs.tbody) return; // Not on dashboard page.

    // Always read fresh from storage so changes from other tabs are reflected.
    const all = getReservationsFromStorage();

    // Sort newest timestamp first.
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply filters.
    const query  = refs.searchInput  ? refs.searchInput.value.trim().toLowerCase()  : '';
    const status = refs.statusFilter ? refs.statusFilter.value : 'all';

    const filtered = all.filter(res => {
        const matchesStatus = status === 'all' || res.status === status;
        const matchesQuery  = !query ||
            res.name.toLowerCase().includes(query)  ||
            res.phone.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ||
            res.id.toLowerCase().includes(query);
        return matchesStatus && matchesQuery;
    });

    // Stats always reflect the FULL unfiltered list (total restaurant picture).
    updateStatCards(all);

    // Render table rows.
    renderTableBody(refs.tbody, filtered);
}

/**
 * Update the three stat counter cards.
 * @param {Reservation[]} all  Full unfiltered list.
 */
function updateStatCards(all) {
    const refs = getDashboardRefs();

    if (refs.totalCount) {
        refs.totalCount.textContent = all.length;
    }

    if (refs.totalGuests) {
        const sum = all.reduce((acc, r) => acc + (parseInt(r.size, 10) || 0), 0);
        refs.totalGuests.textContent = sum;
    }

    if (refs.pendingCount) {
        const pending = all.filter(r => r.status === 'pending').length;
        refs.pendingCount.textContent = pending;
    }
}

/**
 * Build and inject all <tr> rows into the dashboard tbody.
 * All dynamic content is escaped before insertion to prevent XSS.
 * onclick attribute IDs are escaped separately to stay safe inside
 * single-quoted JS string arguments.
 *
 * @param {HTMLTableSectionElement} tbody
 * @param {Reservation[]}           list
 */
function renderTableBody(tbody, list) {
    // Use a DocumentFragment for a single DOM write instead of one per row.
    const fragment = document.createDocumentFragment();

    if (list.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="7" class="no-bookings">No reservations found. Try adjusting your search or filter.</td>`;
        fragment.appendChild(tr);
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
        return;
    }

    list.forEach(res => {
        const tr = document.createElement('tr');

        // Format the booking date in local time (append T00:00 to avoid UTC shift).
        const dateObj    = new Date(res.date + 'T00:00');
        const dateLabel  = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month:   'short',
            day:     'numeric',
            year:    'numeric',
        });

        // Escape the ID for safe use inside an onclick="..." attribute value.
        // The ID format is BK-<digits> so no special chars, but we escape anyway.
        const safeId = escapeAttr(res.id);

        // Build action buttons based on current status.
        let actionButtons = '';

        if (res.status === 'pending') {
            actionButtons += `<button class="action-btn confirm-btn" onclick="updateBookingStatus('${safeId}','confirmed')" aria-label="Confirm booking ${safeId}">Confirm</button>`;
        }
        if (res.status === 'confirmed') {
            actionButtons += `<button class="action-btn" onclick="updateBookingStatus('${safeId}','completed')" aria-label="Mark booking ${safeId} as completed">Complete</button>`;
        }
        actionButtons += `<button class="action-btn delete-btn" onclick="deleteBooking('${safeId}')" aria-label="Delete booking ${safeId}">Delete</button>`;

        tr.innerHTML = `
            <td>
                <span style="font-weight:700;color:var(--brand-terracotta);font-size:0.85rem;">${escapeHtml(res.id)}</span>
            </td>
            <td>
                <div style="font-weight:600;">${escapeHtml(res.name)}</div>
                <div style="font-size:0.8rem;opacity:0.65;">${escapeHtml(res.phone)}</div>
            </td>
            <td style="font-weight:600;text-align:center;">${escapeHtml(res.size)}</td>
            <td>
                <div>${escapeHtml(dateLabel)}</div>
                <div style="font-size:0.8rem;opacity:0.65;">${escapeHtml(res.time)}</div>
            </td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                title="${escapeAttr(res.requests)}">
                ${escapeHtml(res.requests)}
            </td>
            <td>
                <span class="status-badge ${escapeAttr(res.status)}">${escapeHtml(res.status)}</span>
            </td>
            <td>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                    ${actionButtons}
                </div>
            </td>
        `;

        fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

/**
 * Attach search + filter listeners once.
 * Called once from DOMContentLoaded when on the dashboard page.
 */
function initDashboardControls() {
    const refs = getDashboardRefs();
    if (!refs.tbody) return;

    if (refs.searchInput) {
        refs.searchInput.addEventListener('input', renderDashboard);
    }
    if (refs.statusFilter) {
        refs.statusFilter.addEventListener('change', renderDashboard);
    }

    // Initial render.
    renderDashboard();
}

/* ═════════════════════════════════════════════════════════════════════════════
   8. STATUS UPDATE & DELETE
   Exposed on window because dashboard.html calls them from inline onclick
   attributes generated inside renderTableBody().
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Advance a booking to a new status, then re-render the dashboard.
 * Validates that newStatus is a known value before writing.
 *
 * @param {string} id
 * @param {'pending'|'confirmed'|'completed'} newStatus
 */
function updateBookingStatus(id, newStatus) {
    if (!STATUSES.includes(newStatus)) {
        console.error('[booking.js] Unknown status:', newStatus);
        return;
    }

    const reservations = getReservationsFromStorage();
    const index = reservations.findIndex(r => r.id === id);

    if (index === -1) {
        console.warn('[booking.js] Booking not found:', id);
        return;
    }

    reservations[index].status = newStatus;
    saveAllReservationsToStorage(reservations);
    renderDashboard();
}
window.updateBookingStatus = updateBookingStatus;

/**
 * Delete a booking after confirmation, then re-render the dashboard.
 * @param {string} id
 */
function deleteBooking(id) {
    const reservations = getReservationsFromStorage();
    const booking = reservations.find(r => r.id === id);

    if (!booking) {
        console.warn('[booking.js] Booking not found for delete:', id);
        return;
    }

    const confirmed = window.confirm(
        `Delete reservation for "${booking.name}" on ${booking.date} at ${booking.time}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    const updated = reservations.filter(r => r.id !== id);
    saveAllReservationsToStorage(updated);
    renderDashboard();
}
window.deleteBooking = deleteBooking;

/* ═════════════════════════════════════════════════════════════════════════════
   9. ESCAPE HELPERS
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Escape a string for safe insertion into HTML text content.
 * Covers the five dangerous HTML characters.
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

/**
 * Escape a string for safe insertion into an HTML attribute value
 * that is already wrapped in double-quotes, or inside a JS string
 * within an onclick="..." attribute.
 * Strips single quotes entirely (they're rare in names/IDs).
 * @param {*} str
 * @returns {string}
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '') // remove; not needed in our IDs/statuses
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;');
}

/* ═════════════════════════════════════════════════════════════════════════════
   INIT — entry point called after DOM is ready
═════════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initReservationForm();   // index.html  — wires up #resForm
    initDashboardControls(); // dashboard.html — renders table + attaches filters
});
