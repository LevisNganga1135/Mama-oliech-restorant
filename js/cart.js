/**
 * cart.js — Mama Oliech Restaurant
 * Handles cart state, sliding drawer UI, checkout form modal, and client-side validation.
 */

'use strict';

(function () {
    // ── Cart State ────────────────────────────────────────────────────────────
    let cart = [];

    // Initialize Cart
    function init() {
        loadCart();
        createUIElements();
        wireEvents();
        updateBadges();
        renderCart();
    }

    // Load cart from localStorage
    function loadCart() {
        const savedCart = localStorage.getItem('mo_cart');
        if (savedCart) {
            try {
                cart = JSON.parse(savedCart);
            } catch (e) {
                console.error('Error parsing cart from localStorage:', e);
                cart = [];
            }
        }
    }

    // Save cart to localStorage
    function saveCart() {
        localStorage.setItem('mo_cart', JSON.stringify(cart));
    }

    // ── Create UI Elements Dynamically ────────────────────────────────────────
    function createUIElements() {
        // 1. Toast Container
        if (!document.querySelector('.toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // 2. Cart Drawer Overlay & Panel
        if (!document.getElementById('cart-drawer-overlay')) {
            const drawerOverlay = document.createElement('div');
            drawerOverlay.id = 'cart-drawer-overlay';
            drawerOverlay.className = 'cart-drawer-overlay';
            drawerOverlay.innerHTML = `
                <div class="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping Cart">
                    <div class="cart-drawer-header">
                        <h2 class="cart-drawer-title">Room Service Order</h2>
                        <button class="cart-drawer-close" aria-label="Close cart">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="cart-drawer-body" id="cart-items-container">
                        <!-- Items rendered dynamically -->
                    </div>
                    <div class="cart-drawer-footer">
                        <div class="cart-summary-row">
                            <span>Subtotal</span>
                            <span id="cart-subtotal">KES 0</span>
                        </div>
                        <div class="cart-summary-row border-t border-brand-charcoal/10 pt-4">
                            <span class="cart-summary-total">Total Price</span>
                            <span class="cart-summary-total-price" id="cart-total-price">KES 0</span>
                        </div>
                        <button id="checkout-btn" class="bg-brand-terracotta text-white w-full py-3.5 rounded-lg font-semibold text-base hover:scale-[0.98] active:scale-95 transition-all flex justify-center items-center gap-2 mt-2 hover:bg-opacity-95">
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(drawerOverlay);
        }


    }

    // ── Wire Navigation & Modal Events ────────────────────────────────────────
    function wireEvents() {
        const drawerOverlay = document.getElementById('cart-drawer-overlay');

        // Toggle Drawer
        const toggleBtn = document.getElementById('cart-toggle-btn');
        const toggleBtnMobile = document.getElementById('cart-toggle-btn-mobile');
        const closeBtn = drawerOverlay.querySelector('.cart-drawer-close');

        if (toggleBtn) toggleBtn.addEventListener('click', () => toggleCartDrawer(true));
        if (toggleBtnMobile) toggleBtnMobile.addEventListener('click', () => toggleCartDrawer(true));
        if (closeBtn) closeBtn.addEventListener('click', () => toggleCartDrawer(false));

        // Click outside drawer to close
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) {
                toggleCartDrawer(false);
            }
        });

        // Checkout Trigger
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (cart.length === 0) {
                    showToast('Your cart is empty! Add items from the menu.', 'warning');
                    return;
                }
                toggleCartDrawer(false);
                // Redirect to the dedicated checkout page
                window.location.href = 'checkout.html';
            });
        }

        // Escape key handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (drawerOverlay.classList.contains('active')) toggleCartDrawer(false);
            }
        });
    }



    // ── Cart State Operations ────────────────────────────────────────────────
    function addItem(itemId) {
        // Retrieve dynamic menu item list
        const menuItems = window.MENU_ITEMS || [];
        const menuItem = menuItems.find(item => item.id === itemId);

        if (!menuItem) {
            console.error(`Item with ID ${itemId} not found in MENU_ITEMS.`);
            return;
        }

        const existingItem = cart.find(item => item.id === itemId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: itemId,
                quantity: 1
            });
        }

        saveCart();
        updateBadges();
        renderCart();
        showToast(`Added ${menuItem.name} to order.`);
    }

    function updateQuantity(itemId, delta) {
        const itemIndex = cart.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;

        cart[itemIndex].quantity += delta;

        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }

        saveCart();
        updateBadges();
        renderCart();
    }

    function removeFromCart(itemId) {
        cart = cart.filter(item => item.id !== itemId);
        saveCart();
        updateBadges();
        renderCart();
        showToast('Item removed from order.');
    }

    // ── UI Updates ────────────────────────────────────────────────────────────
    function updateBadges() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        const badge = document.getElementById('cart-count-badge');
        const badgeMobile = document.getElementById('cart-count-badge-mobile');

        [badge, badgeMobile].forEach(b => {
            if (b) {
                b.textContent = totalItems;
                if (totalItems > 0) {
                    b.style.opacity = '1';
                } else {
                    b.style.opacity = '0';
                }
            }
        });
    }

    function renderCart() {
        const container = document.getElementById('cart-items-container');
        const checkoutSummaryPrice = document.getElementById('checkout-summary-price');
        if (!container) return;

        const menuItems = window.MENU_ITEMS || [];

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="cart-empty-state">
                    <span class="material-symbols-outlined cart-empty-icon">restaurant</span>
                    <p class="font-headline font-bold text-lg">Your tray is empty</p>
                    <p class="text-sm opacity-80">Browse our lakeside specialties and add them here for Room Service delivery.</p>
                </div>
            `;
            document.getElementById('cart-subtotal').textContent = 'KES 0';
            document.getElementById('cart-total-price').textContent = 'KES 0';
            if (checkoutSummaryPrice) checkoutSummaryPrice.textContent = 'KES 0';
            return;
        }

        let total = 0;
        let html = '';

        cart.forEach(cartItem => {
            const dish = menuItems.find(item => item.id === cartItem.id);
            if (!dish) return;

            const itemTotal = dish.priceValue * cartItem.quantity;
            total += itemTotal;

            html += `
                <div class="cart-item" data-id="${dish.id}">
                    <img class="cart-item-img" src="${dish.image}" alt="${dish.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;75&quot; height=&quot;75&quot; viewBox=&quot;0 0 75 75&quot;><rect width=&quot;75&quot; height=&quot;75&quot; fill=&quot;%23F2EDEB&quot;/><text x=&quot;50%25&quot; y=&quot;60%25&quot; text-anchor=&quot;middle&quot; font-size=&quot;20&quot; fill=&quot;%23D9692D&quot;>🐟</text></svg>'" />
                    <div class="cart-item-details">
                        <div>
                            <h4 class="cart-item-title">${dish.name}</h4>
                            <p class="cart-item-price">KES ${dish.priceValue.toLocaleString()}</p>
                        </div>
                        <div class="cart-item-controls">
                            <div class="cart-quantity-selector">
                                <button class="cart-qty-btn btn-qty-minus" aria-label="Decrease quantity" data-id="${dish.id}">
                                    <span class="material-symbols-outlined text-xs">remove</span>
                                </button>
                                <span class="cart-qty-val">${cartItem.quantity}</span>
                                <button class="cart-qty-btn btn-qty-plus" aria-label="Increase quantity" data-id="${dish.id}">
                                    <span class="material-symbols-outlined text-xs">add</span>
                                </button>
                            </div>
                            <button class="cart-item-remove" aria-label="Remove item" data-id="${dish.id}">
                                <span class="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Update totals
        const formattedTotal = `KES ${total.toLocaleString()}`;
        document.getElementById('cart-subtotal').textContent = formattedTotal;
        document.getElementById('cart-total-price').textContent = formattedTotal;
        if (checkoutSummaryPrice) checkoutSummaryPrice.textContent = formattedTotal;

        // Wire click events inside list
        container.querySelectorAll('.btn-qty-minus').forEach(btn => {
            btn.addEventListener('click', () => updateQuantity(btn.dataset.id, -1));
        });
        container.querySelectorAll('.btn-qty-plus').forEach(btn => {
            btn.addEventListener('click', () => updateQuantity(btn.dataset.id, 1));
        });
        container.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
        });
    }

    function toggleCartDrawer(open) {
        const overlay = document.getElementById('cart-drawer-overlay');
        if (!overlay) return;

        if (open) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            renderCart();
        } else {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ── Toast Notifications Helper ───────────────────────────────────────────
    function showToast(message, type = 'success') {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">
                ${type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'info'}
            </span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Close notification">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;

        container.appendChild(toast);

        // Slide in
        setTimeout(() => toast.classList.add('show'), 50);

        // Auto close after 3 seconds
        const autoClose = setTimeout(() => {
            closeToast(toast);
        }, 3000);

        // Wire close button click
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoClose);
            closeToast(toast);
        });
    }

    function closeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Expose dynamic APIs globally
    window.Cart = {
        addItem: addItem,
        toggle: () => toggleCartDrawer(true)
    };

    // Initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
