/**
 * auth.js — Mama Oliech Restaurant
 * Loaded on every page via <script src="js/auth.js" defer>
 *
 * Responsibilities:
 *  1. User registration & login (localStorage-based)
 *  2. Session management (sessionStorage)
 *  3. Navbar login/logout button injection
 *  4. Login/Register modal (slides in on any page)
 *  5. Expose auth helpers globally for checkout.js & booking.js
 *
 * NOTE: This is frontend-only auth — suitable for demos and school projects.
 * For production, use a real backend with JWT tokens and hashed passwords.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   1. STORAGE KEYS & CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const AUTH_USERS_KEY   = 'mama_oliech_users';      // all registered users
const AUTH_SESSION_KEY = 'mama_oliech_session';    // current logged-in user
const AUTH_ORDERS_KEY  = 'mama_oliech_user_orders'; // orders per user

/* ═══════════════════════════════════════════════════════════════════════════
   2. SIMPLE HASH — not cryptographic, but prevents plain-text passwords
   Uses a basic djb2 hash. Fine for a school project demo.
═══════════════════════════════════════════════════════════════════════════ */
function hashPassword(password) {
    let hash = 5381;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) + hash) + password.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    return String(hash >>> 0); // unsigned 32-bit
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. USER STORE HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/** Read all registered users from localStorage. */
function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
    } catch { return []; }
}

/** Save all users to localStorage. */
function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

/** Find user by email (case-insensitive). */
function findUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. SESSION HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get the currently logged-in user from sessionStorage.
 * Returns null if no one is logged in.
 * @returns {{ id, name, email, phone } | null}
 */
function getCurrentUser() {
    try {
        return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY)) || null;
    } catch { return null; }
}

/** Save current user session. */
function setSession(user) {
    // Store only safe fields — never store the password hash in session
    const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone };
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeUser));
}

/** Clear session (logout). */
function clearSession() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
}

/** Check if a user is logged in. */
function isLoggedIn() {
    return getCurrentUser() !== null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. REGISTER & LOGIN LOGIC
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Register a new user.
 * @returns {{ success: boolean, message: string }}
 */
function registerUser({ name, email, phone, password }) {
    if (!name || name.trim().length < 2)
        return { success: false, message: 'Please enter your full name.' };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return { success: false, message: 'Please enter a valid email address.' };

    if (!phone || !/\d{7,}/.test(phone.replace(/[\s\-().+]/g, '')))
        return { success: false, message: 'Please enter a valid phone number.' };

    if (!password || password.length < 6)
        return { success: false, message: 'Password must be at least 6 characters.' };

    if (findUserByEmail(email))
        return { success: false, message: 'An account with this email already exists.' };

    const users = getUsers();
    const newUser = {
        id:           'USR-' + Date.now(),
        name:         name.trim(),
        email:        email.toLowerCase().trim(),
        phone:        phone.trim(),
        passwordHash: hashPassword(password),
        createdAt:    new Date().toISOString(),
        reservations: [],
        orders:       [],
    };

    users.push(newUser);
    saveUsers(users);
    setSession(newUser);

    return { success: true, message: 'Account created successfully!' };
}

/**
 * Log in an existing user.
 * @returns {{ success: boolean, message: string }}
 */
function loginUser({ email, password }) {
    if (!email || !password)
        return { success: false, message: 'Please enter your email and password.' };

    const user = findUserByEmail(email);

    if (!user)
        return { success: false, message: 'No account found with this email.' };

    if (user.passwordHash !== hashPassword(password))
        return { success: false, message: 'Incorrect password. Please try again.' };

    setSession(user);
    return { success: true, message: 'Welcome back, ' + user.name + '!' };
}

/** Log out the current user. */
function logoutUser() {
    clearSession();
    updateNavbar();
    // Redirect to home if on a protected page
    if (window.location.pathname.includes('profile.html')) {
        window.location.href = 'index.html';
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. ORDER HISTORY — save order under logged-in user
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Save a completed order to the current user's history.
 * Called from checkout.js after successful M-Pesa payment.
 * @param {{ orderId, items, total, mpesaCode }} order
 */
function saveOrderToUser(order) {
    const user = getCurrentUser();
    if (!user) return;

    const users   = getUsers();
    const idx     = users.findIndex(u => u.id === user.id);
    if (idx === -1) return;

    users[idx].orders = users[idx].orders || [];
    users[idx].orders.unshift({
        ...order,
        date: new Date().toISOString(),
    });

    saveUsers(users);
}

/**
 * Save a reservation under the current user.
 * Called from booking.js after form submission.
 * @param {object} reservation
 */
function saveReservationToUser(reservation) {
    const user = getCurrentUser();
    if (!user) return;

    const users = getUsers();
    const idx   = users.findIndex(u => u.id === user.id);
    if (idx === -1) return;

    users[idx].reservations = users[idx].reservations || [];
    users[idx].reservations.unshift(reservation);
    saveUsers(users);
}

/**
 * Get full user data including orders and reservations.
 * @returns {object|null}
 */
function getFullUserData() {
    const session = getCurrentUser();
    if (!session) return null;
    return getUsers().find(u => u.id === session.id) || null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. NAVBAR — inject login/logout button
═══════════════════════════════════════════════════════════════════════════ */

function updateNavbar() {
    // Remove any existing auth button to avoid duplicates
    document.querySelectorAll('.nav-auth-btn').forEach(el => el.remove());

    const user = getCurrentUser();

    // Find the nav element to inject into
    const nav = document.querySelector('header nav') || document.querySelector('header');
    if (!nav) return;

    const btn = document.createElement('div');
    btn.className = 'nav-auth-btn';
    btn.style.cssText = [
        'display: flex',
        'align-items: center',
        'gap: 0.5rem',
        'margin-left: 1rem',
    ].join(';');

    if (user) {
        // Logged in — show name + logout
        btn.innerHTML = `
            <a href="profile.html" style="
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--brand-terracotta, #D9692D);
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 0.4rem;
            ">
                <span style="font-size:1.1rem;">👤</span>
                <span>${escAuthHtml(user.name.split(' ')[0])}</span>
            </a>
            <button id="logout-btn" style="
                background: transparent;
                border: 1.5px solid var(--brand-terracotta, #D9692D);
                color: var(--brand-terracotta, #D9692D);
                border-radius: 8px;
                padding: 0.35rem 0.75rem;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            ">Logout</button>
        `;

        btn.querySelector('#logout-btn').addEventListener('click', logoutUser);

    } else {
        // Not logged in — show Login button
        btn.innerHTML = `
            <button id="open-auth-modal" style="
                background: var(--brand-terracotta, #D9692D);
                color: #fff;
                border: none;
                border-radius: 8px;
                padding: 0.45rem 1rem;
                font-size: 0.85rem;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.2s;
            ">Login</button>
        `;

        btn.querySelector('#open-auth-modal').addEventListener('click', () => openAuthModal());
    }

    nav.appendChild(btn);
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. AUTH MODAL — Login / Register tabs
═══════════════════════════════════════════════════════════════════════════ */

let _authModal = null;

function buildAuthModal() {
    if (_authModal) return;

    _authModal = document.createElement('div');
    _authModal.id = 'auth-modal';
    _authModal.setAttribute('role', 'dialog');
    _authModal.setAttribute('aria-modal', 'true');
    _authModal.setAttribute('aria-label', 'Login or Register');
    _authModal.style.cssText = [
        'display: none',
        'position: fixed',
        'inset: 0',
        'background: rgba(0,0,0,0.55)',
        'z-index: 2000',
        'align-items: center',
        'justify-content: center',
        'padding: 1.5rem',
    ].join(';');

    _authModal.innerHTML = `
        <div style="
            background: #fff;
            border-radius: 20px;
            padding: 2rem;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 8px 40px rgba(0,0,0,0.18);
            position: relative;
        ">
            <!-- Close button -->
            <button id="auth-modal-close" aria-label="Close" style="
                position: absolute;
                top: 1rem; right: 1rem;
                background: none; border: none;
                font-size: 1.4rem; cursor: pointer;
                color: #888; line-height: 1;
            ">✕</button>

            <!-- Logo -->
            <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="font-size:2rem;">🐟</div>
                <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--brand-terracotta,#D9692D);">
                    Mama Oliech
                </div>
            </div>

            <!-- Tabs -->
            <div style="display:flex;border-bottom:2px solid #eee;margin-bottom:1.5rem;">
                <button class="auth-tab active" data-tab="login" style="
                    flex:1; padding:0.6rem; background:none; border:none;
                    font-size:0.95rem; font-weight:700; cursor:pointer;
                    border-bottom: 3px solid var(--brand-terracotta,#D9692D);
                    color: var(--brand-terracotta,#D9692D);
                    margin-bottom: -2px;
                ">Login</button>
                <button class="auth-tab" data-tab="register" style="
                    flex:1; padding:0.6rem; background:none; border:none;
                    font-size:0.95rem; font-weight:600; cursor:pointer;
                    color: #888;
                ">Register</button>
            </div>

            <!-- Global error/success message -->
            <div id="auth-msg" style="
                display:none;
                padding:0.65rem 1rem;
                border-radius:8px;
                font-size:0.875rem;
                font-weight:600;
                margin-bottom:1rem;
                text-align:center;
            "></div>

            <!-- LOGIN FORM -->
            <div id="auth-login-form">
                <div class="auth-field">
                    <label>Email</label>
                    <input type="email" id="login-email" placeholder="you@email.com" autocomplete="email" />
                    <span class="auth-err" id="err-login-email"></span>
                </div>
                <div class="auth-field">
                    <label>Password</label>
                    <input type="password" id="login-password" placeholder="Your password" autocomplete="current-password" />
                    <span class="auth-err" id="err-login-password"></span>
                </div>
                <button id="login-submit-btn" class="auth-submit-btn">Login to My Account</button>
                <p style="text-align:center;font-size:0.82rem;margin-top:1rem;color:#666;">
                    Don't have an account?
                    <button class="auth-switch-tab" data-tab="register" style="background:none;border:none;color:var(--brand-terracotta,#D9692D);font-weight:700;cursor:pointer;">Register here</button>
                </p>
            </div>

            <!-- REGISTER FORM -->
            <div id="auth-register-form" style="display:none;">
                <div class="auth-field">
                    <label>Full Name</label>
                    <input type="text" id="reg-name" placeholder="e.g. John Kamau" autocomplete="name" />
                    <span class="auth-err" id="err-reg-name"></span>
                </div>
                <div class="auth-field">
                    <label>Email</label>
                    <input type="email" id="reg-email" placeholder="you@email.com" autocomplete="email" />
                    <span class="auth-err" id="err-reg-email"></span>
                </div>
                <div class="auth-field">
                    <label>Phone Number</label>
                    <input type="tel" id="reg-phone" placeholder="e.g. 0712 345 678" autocomplete="tel" />
                    <span class="auth-err" id="err-reg-phone"></span>
                </div>
                <div class="auth-field">
                    <label>Password</label>
                    <input type="password" id="reg-password" placeholder="Min. 6 characters" autocomplete="new-password" />
                    <span class="auth-err" id="err-reg-password"></span>
                </div>
                <button id="register-submit-btn" class="auth-submit-btn">Create Account</button>
                <p style="text-align:center;font-size:0.82rem;margin-top:1rem;color:#666;">
                    Already have an account?
                    <button class="auth-switch-tab" data-tab="login" style="background:none;border:none;color:var(--brand-terracotta,#D9692D);font-weight:700;cursor:pointer;">Login here</button>
                </p>
            </div>
        </div>
    `;

    // ── Shared field styles injected once ────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        .auth-field { margin-bottom: 1rem; }
        .auth-field label {
            display: block;
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 0.35rem;
            color: #333;
        }
        .auth-field input {
            width: 100%;
            padding: 0.7rem 1rem;
            border: 1.5px solid rgba(0,0,0,0.15);
            border-radius: 10px;
            font-size: 0.95rem;
            font-family: inherit;
            background: #fafafa;
            box-sizing: border-box;
            transition: border-color 0.2s;
        }
        .auth-field input:focus {
            outline: none;
            border-color: var(--brand-terracotta, #D9692D);
        }
        .auth-err {
            display: block;
            color: #ba1a1a;
            font-size: 0.78rem;
            margin-top: 0.25rem;
            min-height: 1rem;
        }
        .auth-submit-btn {
            width: 100%;
            padding: 0.85rem;
            background: var(--brand-terracotta, #D9692D);
            color: #fff;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            margin-top: 0.5rem;
            transition: background 0.2s;
        }
        .auth-submit-btn:hover { background: #b8521f; }
        .auth-tab.active {
            border-bottom: 3px solid var(--brand-terracotta, #D9692D) !important;
            color: var(--brand-terracotta, #D9692D) !important;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(_authModal);

    // ── Tab switching ────────────────────────────────────────────────────────
    _authModal.querySelectorAll('.auth-tab, .auth-switch-tab').forEach(btn => {
        btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
    });

    // ── Close button ─────────────────────────────────────────────────────────
    _authModal.querySelector('#auth-modal-close').addEventListener('click', closeAuthModal);

    // Close on backdrop click
    _authModal.addEventListener('click', e => {
        if (e.target === _authModal) closeAuthModal();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && _authModal.style.display === 'flex') closeAuthModal();
    });

    // ── Login submit ─────────────────────────────────────────────────────────
    _authModal.querySelector('#login-submit-btn').addEventListener('click', () => {
        clearAuthErrors();
        const email    = _authModal.querySelector('#login-email').value;
        const password = _authModal.querySelector('#login-password').value;

        const result = loginUser({ email, password });

        if (result.success) {
            showAuthMsg(result.message, 'success');
            setTimeout(() => {
                closeAuthModal();
                updateNavbar();
                autofillCheckout();
            }, 800);
        } else {
            showAuthMsg(result.message, 'error');
        }
    });

    // Also submit login on Enter key
    _authModal.querySelector('#login-password').addEventListener('keydown', e => {
        if (e.key === 'Enter') _authModal.querySelector('#login-submit-btn').click();
    });

    // ── Register submit ──────────────────────────────────────────────────────
    _authModal.querySelector('#register-submit-btn').addEventListener('click', () => {
        clearAuthErrors();
        const name     = _authModal.querySelector('#reg-name').value;
        const email    = _authModal.querySelector('#reg-email').value;
        const phone    = _authModal.querySelector('#reg-phone').value;
        const password = _authModal.querySelector('#reg-password').value;

        const result = registerUser({ name, email, phone, password });

        if (result.success) {
            showAuthMsg('Account created! Welcome, ' + name.split(' ')[0] + ' 🎉', 'success');
            setTimeout(() => {
                closeAuthModal();
                updateNavbar();
                autofillCheckout();
            }, 1000);
        } else {
            showAuthMsg(result.message, 'error');
        }
    });
}

function switchAuthTab(tab) {
    const loginForm    = _authModal.querySelector('#auth-login-form');
    const registerForm = _authModal.querySelector('#auth-register-form');
    const tabs         = _authModal.querySelectorAll('.auth-tab');

    clearAuthErrors();
    hideAuthMsg();

    tabs.forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.classList.toggle('active', isActive);
        t.style.color        = isActive ? 'var(--brand-terracotta, #D9692D)' : '#888';
        t.style.borderBottom = isActive ? '3px solid var(--brand-terracotta, #D9692D)' : 'none';
    });

    loginForm.style.display    = tab === 'login'    ? 'block' : 'none';
    registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

function showAuthMsg(message, type) {
    const msg = _authModal.querySelector('#auth-msg');
    msg.textContent   = message;
    msg.style.display = 'block';
    msg.style.background = type === 'success' ? '#e8f5e9' : '#fdecea';
    msg.style.color      = type === 'success' ? '#2e7d32' : '#ba1a1a';
    msg.style.border     = type === 'success' ? '1px solid #a5d6a7' : '1px solid #f5c6cb';
}

function hideAuthMsg() {
    const msg = _authModal && _authModal.querySelector('#auth-msg');
    if (msg) msg.style.display = 'none';
}

function clearAuthErrors() {
    if (!_authModal) return;
    _authModal.querySelectorAll('.auth-err').forEach(el => el.textContent = '');
    _authModal.querySelectorAll('.auth-field input').forEach(el => el.style.borderColor = '');
    hideAuthMsg();
}

function openAuthModal(tab = 'login') {
    buildAuthModal();
    switchAuthTab(tab);
    _authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
        const first = _authModal.querySelector('input');
        if (first) first.focus();
    }, 50);
}

function closeAuthModal() {
    if (!_authModal) return;
    _authModal.style.display = 'none';
    document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. CHECKOUT AUTOFILL
   Called after login/register — fills in name & phone on checkout.html
═══════════════════════════════════════════════════════════════════════════ */
function autofillCheckout() {
    const user      = getCurrentUser();
    if (!user) return;

    const nameInput  = document.getElementById('mpesa-name');
    const phoneInput = document.getElementById('mpesa-phone');

    if (nameInput  && !nameInput.value)  nameInput.value  = user.name;
    if (phoneInput && !phoneInput.value) phoneInput.value = user.phone;

    // Trigger input events so checkout.js validation re-runs
    if (nameInput)  nameInput.dispatchEvent(new Event('input'));
    if (phoneInput) phoneInput.dispatchEvent(new Event('input'));
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. UTILITY
═══════════════════════════════════════════════════════════════════════════ */
function escAuthHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. GLOBAL EXPORTS — used by checkout.js, booking.js, profile.html
═══════════════════════════════════════════════════════════════════════════ */
window.Auth = {
    isLoggedIn,
    getCurrentUser,
    saveOrderToUser,
    saveReservationToUser,
    getFullUserData,
    openAuthModal,
    closeAuthModal,
    logoutUser,
    autofillCheckout,
};

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();

    // If on checkout page and user is logged in, autofill immediately
    if (window.location.pathname.includes('checkout.html')) {
        autofillCheckout();
    }

    // If on profile page and not logged in, redirect to home
    if (window.location.pathname.includes('profile.html') && !isLoggedIn()) {
        window.location.href = 'index.html';
    }
});
