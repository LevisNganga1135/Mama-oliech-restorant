/**
 * auth.js — Mama Oliech Restaurant (Customer Accounts)
 *
 * Talks to the real backend (/api/customers/...) instead of storing a
 * fake user database in localStorage. Only the JWT session token and a
 * small cached copy of the customer's own profile are kept client-side.
 */

'use strict';

(function () {
    const BACKEND_URL = window.MAMA_OLIECH_API_URL || (
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
            ? 'http://localhost:5000'
            : ''
    );

    const TOKEN_KEY = 'mama_oliech_customer_token';
    const CUSTOMER_KEY = 'mama_oliech_customer';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getCurrentCustomer() {
        const raw = localStorage.getItem(CUSTOMER_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function isLoggedIn() {
        return !!getToken();
    }

    function saveSession(token, customer) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    }

    function logoutUser() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CUSTOMER_KEY);
        updateNavbar();
        // If we're on a page that requires login, send the user home
        if (window.location.pathname.endsWith('profile.html')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Register a new customer account.
     * Returns { success, message, customer? }
     */
    async function registerCustomer({ name, email, phone, password }) {
        try {
            const res = await fetch(`${BACKEND_URL}/api/customers/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password })
            });
            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Registration failed.' };
            }

            saveSession(data.token, data.customer);
            return { success: true, message: 'Account created successfully!', customer: data.customer };
        } catch (err) {
            console.error('Registration error:', err);
            return { success: false, message: 'Could not reach the server. Please try again.' };
        }
    }

    /**
     * Log in an existing customer.
     * Returns { success, message, customer? }
     */
    async function loginCustomer({ email, password }) {
        try {
            const res = await fetch(`${BACKEND_URL}/api/customers/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Login failed.' };
            }

            saveSession(data.token, data.customer);
            return { success: true, message: 'Welcome back!', customer: data.customer };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, message: 'Could not reach the server. Please try again.' };
        }
    }

    /**
     * Fetch the logged-in customer's order history from the server.
     */
    async function fetchMyOrders() {
        const token = getToken();
        if (!token) return [];
        try {
            const res = await fetch(`${BACKEND_URL}/api/customers/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error('Failed to fetch order history:', err);
            return [];
        }
    }

    /**
     * Fetch the logged-in customer's reservation history from the server.
     */
    async function fetchMyReservations() {
        const token = getToken();
        if (!token) return [];
        try {
            const res = await fetch(`${BACKEND_URL}/api/customers/reservations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error('Failed to fetch reservation history:', err);
            return [];
        }
    }

    /**
     * Injects a Login link or "Hi, <Name>" + Logout button into the
     * page's <header nav>. Runs automatically on every page that includes
     * this script.
     */
    function updateNavbar() {
        const nav = document.querySelector('header nav');
        if (!nav) return;

        let slot = document.getElementById('nav-auth-slot');
        if (!slot) {
            slot = document.createElement('div');
            slot.id = 'nav-auth-slot';
            slot.style.display = 'flex';
            slot.style.alignItems = 'center';
            slot.style.gap = '0.75rem';
            nav.appendChild(slot);
        }

        if (isLoggedIn()) {
            const customer = getCurrentCustomer();
            const firstName = customer && customer.name ? customer.name.split(' ')[0] : 'Account';

            slot.innerHTML = `
                <a href="profile.html" style="font-weight:600;font-size:0.85rem;color:inherit;text-decoration:none;">
                    Hi, ${firstName}
                </a>
                <button id="nav-logout-btn" style="
                    background: transparent;
                    color: #ba1a1a;
                    border: 1px solid rgba(186,26,26,0.3);
                    border-radius: 8px;
                    padding: 0.4rem 0.9rem;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s;
                ">Logout</button>
            `;
            slot.querySelector('#nav-logout-btn').addEventListener('click', logoutUser);
        } else {
            slot.innerHTML = `
                <a href="login.html" style="
                    background: var(--brand-terracotta, #D9692D);
                    color: #fff;
                    border-radius: 8px;
                    padding: 0.45rem 1rem;
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-decoration: none;
                    display: inline-block;
                ">Login</a>
            `;
        }
    }

    document.addEventListener('DOMContentLoaded', updateNavbar);

    // Expose a small public API for other scripts (checkout.js, booking.js,
    // login.html, profile.html) to use.
    window.Auth = {
        isLoggedIn,
        getToken,
        getCurrentCustomer,
        logoutUser,
        registerCustomer,
        loginCustomer,
        fetchMyOrders,
        fetchMyReservations,
        updateNavbar
    };
})();
