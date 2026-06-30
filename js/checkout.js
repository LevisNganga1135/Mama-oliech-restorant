/**
 * checkout.js — Mama Oliech Restaurant
 * Loaded exclusively on checkout.html
 *
 * Responsibilities:
 *  1. Read cart from sessionStorage and render order summary
 *  2. Handle qty +/- and item removal with live total updates
 *  3. Validate phone input and enable Pay button
 *  4. POST to /api/mpesa/stkpush to trigger STK Push
 *  5. Poll /api/mpesa/status/:id every 3s and show modal states
 */

'use strict';

/* ─── CONFIG ────────────────────────────────────────────────────────────── */

/** Your backend server URL. Change this if you deploy. */
const API_BASE = 'http://localhost:3000';

/** How often (ms) to poll the server for payment status. */
const POLL_INTERVAL_MS = 3000;

/** Max polls before we give up and show a timeout message. */
const MAX_POLLS = 40; // 40 × 3s = 2 minutes

/* ─── CART STORAGE ──────────────────────────────────────────────────────── */

const CART_KEY = 'mama_oliech_cart';

function getCart() {
    try {
        return JSON.parse(sessionStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function clearCart() {
    sessionStorage.removeItem(CART_KEY);
}

/* ─── DOM REFS ──────────────────────────────────────────────────────────── */

const cartContainer  = document.getElementById('cart-items-container');
const cartTotals     = document.getElementById('cart-totals');
const subtotalEl     = document.getElementById('subtotal-display');
const totalEl        = document.getElementById('total-display');
const nameInput      = document.getElementById('mpesa-name');
const phoneInput     = document.getElementById('mpesa-phone');
const phonePreview   = document.getElementById('phone-preview');
const payBtn         = document.getElementById('pay-btn');
const errName        = document.getElementById('err-name');
const errPhone       = document.getElementById('err-phone');

// Modal elements
const modal          = document.getElementById('payment-modal');
const modalPending   = document.getElementById('modal-pending');
const modalSuccess   = document.getElementById('modal-success');
const modalFailed    = document.getElementById('modal-failed');
const modalPhone     = document.getElementById('modal-phone');
const mpesaCode      = document.getElementById('mpesa-receipt-code');
const modalSuccDet   = document.getElementById('modal-success-detail');
const modalFailRsn   = document.getElementById('modal-fail-reason');
const cancelBtn      = document.getElementById('modal-cancel-btn');
const doneBtn        = document.getElementById('modal-done-btn');
const retryBtn       = document.getElementById('modal-retry-btn');

/* ─── POLLING STATE ─────────────────────────────────────────────────────── */

let pollTimer        = null;
let pollCount        = 0;
let currentCheckoutId = null;

/* ═══════════════════════════════════════════════════════════════════════════
   1. RENDER CART SUMMARY
═══════════════════════════════════════════════════════════════════════════ */

function formatKES(amount) {
    return 'KES ' + Number(amount).toLocaleString('en-KE');
}

function getCartTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.priceValue * item.qty), 0);
}

function renderCart() {
    const cart = getCart();

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="cart-empty">
                <p>🛒 Your cart is empty.</p>
                <a href="menu.html" style="
                    display:inline-block;
                    text-decoration:none;
                    padding:0.7rem 1.5rem;
                    background:var(--brand-terracotta,#D9692D);
                    color:#fff;
                    border-radius:10px;
                    font-weight:700;
                ">Browse Menu</a>
            </div>`;
        cartTotals.style.display = 'none';
        setPayButtonState(false);
        return;
    }

    // Build cart rows
    const fragment = document.createDocumentFragment();

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.setAttribute('data-id', item.id);

        row.innerHTML = `
            <div class="cart-item-name">${escHtml(item.name)}</div>
            <div class="cart-item-qty">
                <button class="qty-btn" data-action="decrement" data-id="${escHtml(item.id)}" aria-label="Decrease quantity of ${escHtml(item.name)}">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" data-action="increment" data-id="${escHtml(item.id)}" aria-label="Increase quantity of ${escHtml(item.name)}">+</button>
            </div>
            <div class="cart-item-price">${formatKES(item.priceValue * item.qty)}</div>
            <button class="remove-btn" data-action="remove" data-id="${escHtml(item.id)}" aria-label="Remove ${escHtml(item.name)} from cart" title="Remove item">✕</button>
        `;

        fragment.appendChild(row);
    });

    cartContainer.innerHTML = '';
    cartContainer.appendChild(fragment);

    // Update totals
    const total = getCartTotal(cart);
    subtotalEl.textContent = formatKES(total);
    totalEl.textContent    = formatKES(total);
    cartTotals.style.display = 'block';

    // Update pay button text with total
    if (payBtn && total > 0) {
        payBtn.textContent = `Pay ${formatKES(total)} via M-Pesa`;
    }

    // Enable pay button only if cart has items AND phone is valid
    setPayButtonState(cart.length > 0 && isPhoneValid());
}

/* ─── Cart mutation handlers ────────────────────────────────────────────── */

cartContainer.addEventListener('click', e => {
    const btn    = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    let cart     = getCart();

    if (action === 'increment') {
        const item = cart.find(c => c.id === id);
        if (item) item.qty += 1;

    } else if (action === 'decrement') {
        const item = cart.find(c => c.id === id);
        if (item) {
            item.qty -= 1;
            if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
        }

    } else if (action === 'remove') {
        cart = cart.filter(c => c.id !== id);
    }

    saveCart(cart);
    renderCart();
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. PHONE VALIDATION & LIVE PREVIEW
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Normalise phone to 2547XXXXXXXX format.
 * Accepts: 07XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
function normalisePhone(raw) {
    return raw
        .replace(/\s+/g, '')
        .replace(/^\+/, '')
        .replace(/^0/, '254');
}

function isPhoneValid() {
    const normalised = normalisePhone(phoneInput.value || '');
    return /^2547\d{8}$/.test(normalised);
}

function isNameValid() {
    return (nameInput.value || '').trim().length >= 2;
}

function setPayButtonState(enabled) {
    payBtn.disabled = !enabled;
    payBtn.setAttribute('aria-disabled', String(!enabled));
}

phoneInput.addEventListener('input', () => {
    errPhone.textContent = '';
    phoneInput.style.borderColor = '';

    const val = phoneInput.value.trim();

    // Live preview
    if (val.length > 3) {
        const normalised = normalisePhone(val);
        phonePreview.textContent = '+' + normalised;
    } else {
        phonePreview.textContent = 'your phone';
    }

    setPayButtonState(isPhoneValid() && isNameValid() && getCart().length > 0);
});

nameInput.addEventListener('input', () => {
    errName.textContent = '';
    nameInput.style.borderColor = '';
    setPayButtonState(isPhoneValid() && isNameValid() && getCart().length > 0);
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. PAY BUTTON — trigger STK Push
═══════════════════════════════════════════════════════════════════════════ */

payBtn.addEventListener('click', async () => {
    // ── Validate ────────────────────────────────────────────────────────────
    let valid = true;

    if (!isNameValid()) {
        errName.textContent   = 'Please enter your full name.';
        nameInput.style.borderColor = '#ba1a1a';
        valid = false;
    }

    if (!isPhoneValid()) {
        errPhone.textContent   = 'Enter a valid Safaricom number (07XXXXXXXX).';
        phoneInput.style.borderColor = '#ba1a1a';
        valid = false;
    }

    if (!valid) return;

    const cart  = getCart();
    if (cart.length === 0) return;

    const total = getCartTotal(cart);
    const phone = normalisePhone(phoneInput.value);
    const name  = nameInput.value.trim();

    // ── Build order description ──────────────────────────────────────────────
    const itemNames = cart.map(i => `${i.name} ×${i.qty}`).join(', ');
    const orderId   = 'ORD-' + Date.now();

    // ── Disable button to prevent double-tap ────────────────────────────────
    payBtn.disabled  = true;
    payBtn.textContent = 'Sending request…';

    try {
        const response = await fetch(`${API_BASE}/api/mpesa/stkpush`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone:       phone,
                amount:      total,
                orderId:     orderId,
                description: 'Mama Oliech: ' + itemNames.slice(0, 100),
            }),
        });

        const data = await response.json();

        if (!data.success) {
            // Server returned a handled error (e.g. invalid phone, Daraja error)
            errPhone.textContent = data.message || 'Payment request failed. Try again.';
            phoneInput.style.borderColor = '#ba1a1a';
            resetPayButton(total);
            return;
        }

        // ── STK Push sent — show modal and start polling ─────────────────────
        currentCheckoutId = data.checkoutRequestId;
        showModalPending(phone);
        startPolling(currentCheckoutId, total);

    } catch (err) {
        console.error('[STK Push]', err);
        errPhone.textContent = 'Could not reach the server. Is it running on port 3000?';
        phoneInput.style.borderColor = '#ba1a1a';
        resetPayButton(total);
    }
});

function resetPayButton(total) {
    payBtn.disabled    = false;
    payBtn.textContent = `Pay ${formatKES(total)} via M-Pesa`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. PAYMENT STATUS POLLING
   Polls GET /api/mpesa/status/:checkoutId every POLL_INTERVAL_MS ms.
   Stops when status is 'success' or 'failed', or after MAX_POLLS.
═══════════════════════════════════════════════════════════════════════════ */

function startPolling(checkoutId, total) {
    pollCount = 0;
    stopPolling(); // clear any existing timer

    pollTimer = setInterval(async () => {
        pollCount++;

        try {
            const res    = await fetch(`${API_BASE}/api/mpesa/status/${checkoutId}`);
            const data   = await res.json();

            if (data.status === 'success') {
                stopPolling();
                showModalSuccess(data.mpesaCode, data.amount, data.phone);

                // Save order to logged-in user's history
                if (window.Auth && window.Auth.isLoggedIn()) {
                    window.Auth.saveOrderToUser({
                        orderId:   checkoutId,
                        items:     getCart(),
                        total:     getCartTotal(getCart()),
                        mpesaCode: data.mpesaCode,
                    });
                }

                clearCart(); // wipe cart after successful payment
                return;
            }

            if (data.status === 'failed') {
                stopPolling();
                showModalFailed(data.resultDesc);
                resetPayButton(total);
                return;
            }

            // still 'pending' — keep polling
            if (pollCount >= MAX_POLLS) {
                stopPolling();
                showModalFailed('Payment timed out. Please try again or pay at the counter.');
                resetPayButton(total);
            }

        } catch (err) {
            console.warn('[Poll error]', err.message);
            // Network hiccup — keep polling, don't stop
        }

    }, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. MODAL STATE CONTROLLERS
═══════════════════════════════════════════════════════════════════════════ */

function showModal() {
    modal.style.display = 'flex';
    // Small delay so display:flex is painted before opacity kicks in (if you add CSS transitions)
    requestAnimationFrame(() => modal.classList.add('active'));
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function showModalPending(phone) {
    modalPending.style.display = 'block';
    modalSuccess.style.display = 'none';
    modalFailed.style.display  = 'none';
    modalPhone.textContent     = '+' + phone;
    showModal();
}

function showModalSuccess(receiptCode, amount, phone) {
    modalPending.style.display = 'none';
    modalSuccess.style.display = 'block';
    modalFailed.style.display  = 'none';

    mpesaCode.textContent    = receiptCode || '—';
    modalSuccDet.textContent = amount
        ? `KES ${Number(amount).toLocaleString('en-KE')} received from ${phone}. Thank you!`
        : 'Payment confirmed. Thank you!';
}

function showModalFailed(reason) {
    modalPending.style.display = 'none';
    modalSuccess.style.display = 'none';
    modalFailed.style.display  = 'block';

    modalFailRsn.textContent = reason || 'Payment was not completed. Please try again.';
}

/* ─── Modal button handlers ─────────────────────────────────────────────── */

// Cancel while waiting — stop polling, close modal
cancelBtn.addEventListener('click', () => {
    stopPolling();
    hideModal();
    const total = getCartTotal(getCart());
    resetPayButton(total);
});

// Done after success — go back to menu
doneBtn.addEventListener('click', () => {
    hideModal();
    window.location.href = 'menu.html';
});

// Retry after failure — close modal, let user try again
retryBtn.addEventListener('click', () => {
    hideModal();
    const total = getCartTotal(getCart());
    resetPayButton(total);
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. UTILITY
═══════════════════════════════════════════════════════════════════════════ */

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. AUTH INTEGRATION
   — Autofill name & phone from logged-in user
   — Save completed order to user's history
   — Show login prompt if not logged in
═══════════════════════════════════════════════════════════════════════════ */

function initAuthIntegration() {
    // Autofill if user is already logged in
    if (window.Auth && window.Auth.isLoggedIn()) {
        window.Auth.autofillCheckout();
    }

    // Show a subtle "login to save your order" banner if not logged in
    if (window.Auth && !window.Auth.isLoggedIn()) {
        const banner = document.createElement('div');
        banner.style.cssText = [
            'background: #fff8f0',
            'border: 1.5px solid var(--brand-terracotta, #D9692D)',
            'border-radius: 10px',
            'padding: 0.75rem 1rem',
            'font-size: 0.85rem',
            'margin-bottom: 1rem',
            'display: flex',
            'align-items: center',
            'justify-content: space-between',
            'gap: 0.5rem',
            'flex-wrap: wrap',
        ].join(';');
        banner.innerHTML = `
            <span>👤 <strong>Login</strong> to save your order history and auto-fill your details.</span>
            <button id="checkout-login-btn" style="
                background: var(--brand-terracotta, #D9692D);
                color: #fff; border: none; border-radius: 8px;
                padding: 0.4rem 0.9rem; font-size: 0.82rem;
                font-weight: 700; cursor: pointer;
            ">Login / Register</button>
        `;

        // Insert banner above the payment form
        const payPanel = document.querySelector('.checkout-panel:last-of-type');
        if (payPanel) payPanel.insertBefore(banner, payPanel.querySelector('h2').nextSibling);

        banner.querySelector('#checkout-login-btn').addEventListener('click', () => {
            window.Auth.openAuthModal('login');
        });
    }
}

/* ─── INIT ──────────────────────────────────────────────────────────────── */
renderCart();
initAuthIntegration();
