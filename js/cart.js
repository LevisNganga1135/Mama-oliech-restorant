/**
 * cart.js — Mama Oliech Restaurant
 * Loaded on menu.html AFTER menu.js
 *
 * Responsibilities:
 *  1. Maintain a cart array in sessionStorage
 *  2. Add "Add to Cart" button on each menu card
 *  3. Show a floating cart badge with item count
 *  4. Navigate to checkout.html with cart data
 */

'use strict';

/* ─── CART STORAGE KEY ──────────────────────────────────────────────────── */
const CART_KEY = 'mama_oliech_cart';

/* ─── HELPERS ───────────────────────────────────────────────────────────── */

/** Read cart from sessionStorage. Returns [] if empty or corrupt. */
function getCart() {
    try {
        return JSON.parse(sessionStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

/** Save cart array to sessionStorage. */
function saveCart(cart) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/** Get total number of items in cart (sum of quantities). */
function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Add an item to cart, or increment qty if it already exists.
 * @param {{ id, name, price, priceValue, category }} item
 */
function addToCart(item) {
    const cart     = getCart();
    const existing = cart.find(c => c.id === item.id);

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }

    saveCart(cart);
    updateCartBadge();
    showAddedFeedback(item.id);
}

/* ─── CART BADGE (floating bottom-right button) ─────────────────────────── */

let _cartBadge = null;

function createCartBadge() {
    _cartBadge = document.createElement('div');
    _cartBadge.id = 'cart-float-btn';
    _cartBadge.setAttribute('role', 'link');
    _cartBadge.setAttribute('tabindex', '0');
    _cartBadge.setAttribute('aria-label', 'View cart');
    _cartBadge.style.cssText = [
        'position: fixed',
        'bottom: 2rem',
        'right: 2rem',
        'background: var(--brand-terracotta, #D9692D)',
        'color: #fff',
        'border: none',
        'border-radius: 999px',
        'padding: 0.85rem 1.4rem',
        'font-size: 1rem',
        'font-weight: 700',
        'cursor: pointer',
        'display: flex',
        'align-items: center',
        'gap: 0.6rem',
        'box-shadow: 0 4px 20px rgba(0,0,0,0.22)',
        'z-index: 999',
        'transition: transform 0.15s ease, opacity 0.2s ease',
        'opacity: 0',
        'transform: translateY(1rem)',
        'pointer-events: none',
    ].join(';');

    _cartBadge.innerHTML = `
        <span style="font-size:1.3rem;">🛒</span>
        <span id="cart-badge-count">0</span>
        <span style="font-size:0.9rem;font-weight:600;">View Cart</span>
    `;

    // Navigate to checkout on click or Enter/Space
    const go = () => { window.location.href = 'checkout.html'; };
    _cartBadge.addEventListener('click', go);
    _cartBadge.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') go();
    });

    document.body.appendChild(_cartBadge);
}

/** Show/hide badge and update count number. */
function updateCartBadge() {
    if (!_cartBadge) return;
    const count = getCartCount();
    const countEl = document.getElementById('cart-badge-count');
    if (countEl) countEl.textContent = count;

    if (count > 0) {
        _cartBadge.style.opacity = '1';
        _cartBadge.style.transform = 'translateY(0)';
        _cartBadge.style.pointerEvents = 'auto';
    } else {
        _cartBadge.style.opacity = '0';
        _cartBadge.style.transform = 'translateY(1rem)';
        _cartBadge.style.pointerEvents = 'none';
    }
}

/* ─── ADD-TO-CART BUTTON ON EACH CARD ──────────────────────────────────── */

/**
 * Inject an "Add to Cart" button into each rendered menu card.
 * Called after renderMenu() — we watch for DOM changes using MutationObserver
 * so it works even after filter/search re-renders.
 */
function injectCartButtons() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;

    const attachButtons = () => {
        grid.querySelectorAll('.menu-card').forEach(card => {
            // Skip if button already injected
            if (card.querySelector('.add-to-cart-btn')) return;

            const itemId = card.getAttribute('data-id');
            // Find the matching MENU_ITEMS entry (defined in menu.js)
            const item = window.MENU_ITEMS
                ? window.MENU_ITEMS.find(i => i.id === itemId)
                : null;

            if (!item) return;

            // Find the badge row (last element in card body) and append button there
            const body = card.querySelector('.menu-card-body');
            if (!body) return;

            const btn = document.createElement('button');
            btn.className = 'add-to-cart-btn';
            btn.setAttribute('aria-label', `Add ${item.name} to cart`);
            btn.style.cssText = [
                'margin-top: 1rem',
                'width: 100%',
                'padding: 0.65rem 1rem',
                'background: var(--brand-terracotta, #D9692D)',
                'color: #fff',
                'border: none',
                'border-radius: 8px',
                'font-size: 0.9rem',
                'font-weight: 700',
                'cursor: pointer',
                'transition: background 0.2s ease, transform 0.1s ease',
                'letter-spacing: 0.02em',
            ].join(';');
            btn.textContent = '+ Add to Cart';

            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#b8521f';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'var(--brand-terracotta, #D9692D)';
            });

            btn.addEventListener('click', () => {
                addToCart(item);
            });

            body.appendChild(btn);
        });
    };

    // Attach immediately for initial render
    attachButtons();

    // Re-attach after filter/search re-renders the grid
    const observer = new MutationObserver(attachButtons);
    observer.observe(grid, { childList: true });
}

/**
 * Briefly flash the "Add to Cart" button green as visual feedback.
 * @param {string} itemId
 */
function showAddedFeedback(itemId) {
    const card = document.querySelector(`.menu-card[data-id="${itemId}"]`);
    if (!card) return;

    const btn = card.querySelector('.add-to-cart-btn');
    if (!btn) return;

    const original = btn.textContent;
    btn.textContent = '✓ Added!';
    btn.style.background = '#2e7d32'; // green

    setTimeout(() => {
        btn.textContent = original;
        btn.style.background = 'var(--brand-terracotta, #D9692D)';
    }, 1200);
}

/* ─── INIT ──────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    // Only run on menu page
    if (!document.getElementById('menu-grid')) return;

    createCartBadge();
    updateCartBadge();
    injectCartButtons();
});

// Expose CART_KEY and getCart globally so checkout.js can read the cart
window.CART_KEY = CART_KEY;
window.getCart  = getCart;
