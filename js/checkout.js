/**
 * checkout.js — Mama Oliech Restaurant
 * Drives the dedicated checkout page (checkout.html).
 * Manages tab switching, input validation, payment sub-forms, and processing simulations.
 */

'use strict';

(function () {
    let cart = [];
    let activeTab = 'delivery'; // 'delivery' | 'takeaway' | 'room_service' | 'dine_in'
    let activePaymentTab = 'mpesa'; // 'mpesa' | 'card'
    let deliveryFee = 0;
    const USE_REAL_BACKEND = true;

    const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
        ? 'http://localhost:5000'
        : '';

    // Initialize Page
    function init() {
        loadCart();
        wireEvents();
        renderPaymentDetails();

        // Show loading indicator in summary container
        const summaryContainer = document.getElementById('checkout-summary-items');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<div class="text-xs opacity-75 py-4">Loading order details...</div>';
        }

        // Fetch menu items from database
        fetch(`${BACKEND_URL}/api/dishes`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch dishes');
                return res.json();
            })
            .then(data => {
                window.MENU_ITEMS = data;
                renderOrderSummary();
                updatePricingTotals();
            })
            .catch(err => {
                console.error('💥 Failed to load database dishes, falling back to local list:', err);
                loadFallbackMenuItems();
                renderOrderSummary();
                updatePricingTotals();
            });
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
        // Redirect back to menu if cart is empty (unless we are viewing success)
        if (cart.length === 0 && !document.getElementById('checkout-success-view').classList.contains('active')) {
            window.location.href = 'menu.html';
        }
    }

    // Render summary items in the right column
    function renderOrderSummary() {
        const container = document.getElementById('checkout-summary-items');
        if (!container) return;

        const menuItems = window.MENU_ITEMS || [];
        if (menuItems.length === 0) {
            // If MENU_ITEMS is not loaded yet (since menu.js is not on this page),
            // let's define a backup list or load it dynamically.
            // Since MENU_ITEMS is defined globally on menu.js, we can also load it directly:
            // Let's check if window.MENU_ITEMS is undefined.
            // Actually, we can fetch the dishes from the server or define a quick fallback in memory.
            // Let's load the menu items array statically as fallback:
            loadFallbackMenuItems();
        }

        const items = window.MENU_ITEMS || [];
        let html = '';

        cart.forEach(cartItem => {
            const dish = items.find(item => item.id === cartItem.id);
            if (!dish) return;

            const itemTotal = dish.priceValue * cartItem.quantity;

            html += `
                <div class="flex gap-3 items-center bg-brand-bg/50 p-2.5 rounded-lg border border-brand-charcoal/5">
                    <img class="w-12 h-12 rounded-lg object-cover bg-surface-container" src="${dish.image}" alt="${dish.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;50&quot; height=&quot;50&quot; viewBox=&quot;0 0 50 50&quot;><rect width=&quot;50&quot; height=&quot;50&quot; fill=&quot;%23F2EDEB&quot;/><text x=&quot;50%25&quot; y=&quot;60%25&quot; text-anchor=&quot;middle&quot; font-size=&quot;15&quot;>🐟</text></svg>'" />
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-bold truncate text-brand-charcoal">${dish.name}</h4>
                        <p class="text-[10px] opacity-75">KES ${dish.priceValue.toLocaleString()} x ${cartItem.quantity}</p>
                    </div>
                    <span class="text-xs font-bold text-brand-charcoal">KES ${itemTotal.toLocaleString()}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function loadFallbackMenuItems() {
        window.MENU_ITEMS = [
            { id: 'tilapia-dry', name: 'Whole Tilapia (Dry Fry)', priceValue: 1200, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXtTWMi6q7mgXF28CjVVVB9xh_n2xTuMhevNiPI-qzYlW5MW8UNBJA5uY3PddKMcCq-ziaDp6shRR-cEnwiPmvmlqnzSldn0X2zwRqHBld8VTSByJOhhVwsyyJqUp8wwr3ZrXMISKqaBgR6USA6br_gFlAi5a3Qpxa_vCBsQY1QVsyrMSoOm7RtYg7S5g_haMEnbqLxZFCs3e4qlp_EKpon8oANtPMtmmmm9gCN74bEkVwSAPnl0XW' },
            { id: 'tilapia-wet', name: 'Whole Tilapia (Wet Fry)', priceValue: 1350, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKu2uOyOXITPsJ-kAp8tXar2JNtJMbhJJDXRSub7PYKHqsyCrv5RDiq5SXE-A5HAl_ewskWkpJ75ppwrEKHutogGUjSqQEmHV8H0iFqUstGoq5DI-SlF6x6SpU6vzd9OAg4x_OX7zVCL53LwMk1WiECMGAPq_j_tMSBIwpoEkhX7t83wFtN2wVYO7Y4iRLD1uSDKYXqkbi9KsIbnQ_084zS65uUzp6-NwoWvtNAwnS34AG_COdx-rs' },
            { id: 'zuckerberg-special', name: 'The Zuckerberg Special', priceValue: 1450, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAO75jHTM-cAuEcr8rClPXJT5fTV9rI1QpfoxXSQve9shgLcxWN9fPEbg_Us_yBfLiE-_UcXfdqybS4ElN3edC4PZPJCi61uSVt6f_KaGIkTR6ZhEoy7JKtYygtBE9JZDKsSR4qZHVFBRjFOlMiw0byZO6PiQcPeJZz5NP-x7uYDW7MGqCA1TFpO8se2KTRpnXDfEbouHEDcB7vaS-JbzwHwsynqB3E56OrR8MKwOZzY7SbBmraLPkZ' },
            { id: 'coconut-perch', name: 'Coconut Nile Perch Fillet', priceValue: 1500, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4ruQ-xIKchEwkaUwmu79gUZXyCPfSMIC40wYuFQOhqcfZAa_k4XbzSTmgYxKifVLPAWLqY-kjykDUNMZxVe2u0YshApBa3GuRh_Zoc3DYyiPd6yfwhc9bOC3R-FjYD6ubwXjMsBwL9302SZRXuTfddB4vFCr-A7151XVXzNjO4KWgHhPbTAE3zeTxS1hU1darG9hRSkPBGS3u5vrU-h3IHWbBimm-vAurx5oBWmbnI9av2r5f6lfP' },
            { id: 'catfish-stew', name: 'Claypot Catfish Stew', priceValue: 1600, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCe3xR9CvwlA4JR5XK-6KevSE3aVdSfAcuHVIITFv2QrReEGMeNHpC4mDENNd5438IzVJaPh1S8cuLj37u7rzYp6AnNrIliElrO5bQ44rpVK-4WhGm_-cyS46KR9TR4dJUu0UUMI3Z4REH1zG3zyVuRO0FcKazjcSRqwtNQvyls3siM9xqJFIM51lcDgMmjSwlV_heLs8sGtaGTir9sjzgBimprLC38b87C21qJ7cA_lViyQHzbOrue' },
            { id: 'side-ugali', name: 'White Maize Ugali', priceValue: 200, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E' },
            { id: 'side-sukuma', name: 'Sautéed Sukuma Wiki', priceValue: 150, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQhf69-Ihz8_kT__Endw2W_-_5064SwBHzZR6FBK5EETAqpbPGmMrd6uT_E9BHaxI12efdDbs-GaRvF56vbbou3NxI9xvjSPguZ-Yv73JBs7tDcTbuk0GUoiDXpyTGfdYntnnH-jaCMT9Sx_EG3mDkue_jcuX3zOK8sLfSMFU1MYT6lELJ2HffYhqrjazsbv2u0WX40GDZSJVD9_GGpJTqCOeGcIxHjflvLl-nwFdpbdKgbDxcrh-Q' },
            { id: 'side-managu', name: 'Traditional Managu', priceValue: 250, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9SiQwpEDwlGxYVVkKon1UqTXF8eE5PZWXD3Fz_YWma2ddMoYvgUoa3mhNkPOvm60Z5KO_Gt1DPOgfa00v9H1ZI6o705timUblF-3ag017ZjTBLBNAIBtlRM-n8TDzCPIOwUxrkvC-vyHiRydp6u6_-gIdyetytuYZV0NGcpX_LrYefb7T0OizNmHBM-7LHh_sCpdomaTvMOpwwQVP4RFLJdx3f9AFth1vf39idoF8lPb13naKpYw0' },
            { id: 'side-kachumbari', name: 'Fresh Spicy Kachumbari', priceValue: 150, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_VAk5ajUc7W7reoolTN5yVWBrqX5OYoD4V3MIPp0ie9ZQQxlsu98JRmgzS0PNzDAAezC2qwaRllutkNBfvZqnN6haAB_vFqSxDxTIr9zg67211cF65ett9jnsVpcgBPnVkHtbx6Qg38N-ByGhjo-YsXpDpg9g_I3wXtqzB4MtWAGwCo8MYuS_CG5IsVRRCeCouWUYZmnGpca76LzznGD0C-TtZ0TEEtsaDohtaV4dCqjONO-zojOa' },
            { id: 'drink-juice', name: 'Fresh Mango Juice', priceValue: 300, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E' }
        ];
    }

    // Update prices based on delivery area/type selection
    function updatePricingTotals() {
        const subtotalEl = document.getElementById('summary-subtotal');
        const feeEl = document.getElementById('summary-fee');
        const totalEl = document.getElementById('summary-total');
        const submitBtn = document.getElementById('checkout-submit-btn');
        if (!subtotalEl || !feeEl || !totalEl) return;

        const menuItems = window.MENU_ITEMS || [];
        const subtotal = cart.reduce((sum, item) => {
            const dish = menuItems.find(d => d.id === item.id);
            return sum + (dish ? dish.priceValue : 0) * item.quantity;
        }, 0);

        // Calculate delivery fees
        if (activeTab === 'delivery') {
            const area = document.getElementById('checkout-delivery-area').value;
            if (area === 'kilimani') deliveryFee = 0;
            else if (area === 'kileleshwa' || area === 'lavington') deliveryFee = 150;
            else deliveryFee = 200; // Westlands, CBD
        } else {
            deliveryFee = 0; // Takeaway, Room Service, Dine-in are free
        }

        const grandTotal = subtotal + deliveryFee;

        subtotalEl.textContent = `KES ${subtotal.toLocaleString()}`;
        feeEl.textContent = `KES ${deliveryFee.toLocaleString()}`;
        totalEl.textContent = `KES ${grandTotal.toLocaleString()}`;
        if (submitBtn) {
            submitBtn.textContent = `Confirm & Pay KES ${grandTotal.toLocaleString()}`;
        }
    }

    // Switch checkout service tabs
    function switchTab(tabType) {
        if (tabType === activeTab) return;

        // Toggle Active Tab Styling
        document.querySelectorAll('.checkout-tab').forEach(btn => {
            if (btn.dataset.type === tabType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Hide all input panels and show active panel
        document.querySelectorAll('.field-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        let targetPanelId = 'panel-delivery';
        if (tabType === 'takeaway') targetPanelId = 'panel-takeaway';
        else if (tabType === 'room_service') targetPanelId = 'panel-room';
        else if (tabType === 'dine_in') targetPanelId = 'panel-dinein';

        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) targetPanel.classList.add('active');

        // Manage Payment dropdown constraints
        const paymentSelect = document.getElementById('checkout-payment');
        const roomChargeOption = document.getElementById('option-room-charge');
        
        if (paymentSelect) {
            if (tabType === 'room_service') {
                if (roomChargeOption) roomChargeOption.style.display = '';
            } else {
                // If switching away from Room Svc, default back to Online Card if Room Charge was selected
                if (paymentSelect.value === 'room_charge') {
                    paymentSelect.value = 'card_online';
                }
                if (roomChargeOption) roomChargeOption.style.display = 'none';
            }
        }

        activeTab = tabType;
        renderPaymentDetails();
        updatePricingTotals();
    }

    // Wire listeners
    function wireEvents() {
        // Tab buttons
        document.querySelectorAll('.checkout-tab').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.type));
        });

        // Delivery Area selector changes delivery fee
        const areaSelect = document.getElementById('checkout-delivery-area');
        if (areaSelect) {
            areaSelect.addEventListener('change', updatePricingTotals);
        }

        // Payment select dropdown change
        const paymentSelect = document.getElementById('checkout-payment');
        if (paymentSelect) {
            paymentSelect.addEventListener('change', renderPaymentDetails);
        }

        // Form Submit
        const form = document.getElementById('restaurant-checkout-form');
        if (form) {
            form.addEventListener('submit', handleCheckoutSubmit);
        }
    }

    // Dynamic Payment Fields Rendering (Card vs M-Pesa tabs)
    function renderPaymentDetails() {
        const paymentDetailsBox = document.getElementById('payment-details-box');
        const paymentSelect = document.getElementById('checkout-payment');
        if (!paymentDetailsBox || !paymentSelect) return;

        const val = paymentSelect.value;
        if (val === 'room_charge') {
            paymentDetailsBox.innerHTML = `
                <div class="payment-info-alert">
                    <span class="material-symbols-outlined payment-info-icon" style="font-size: 1.2rem;">info</span>
                    <span class="text-xs">Your meal bill will be posted to your room folio. The details will match the Guest Last Name and PIN entered in the room service fields above.</span>
                </div>
            `;
        } else if (val === 'card_online') {
            paymentDetailsBox.innerHTML = `
                <div class="payment-method-panel active flex flex-col gap-3 mt-2">
                    <div class="payment-tab-group" role="tablist">
                        <button type="button" id="tab-mpesa" class="payment-tab ${activePaymentTab === 'mpesa' ? 'active' : ''}" role="tab" aria-selected="${activePaymentTab === 'mpesa'}" aria-controls="panel-mpesa">
                            <span class="material-symbols-outlined text-sm">phone_iphone</span> M-Pesa Express
                        </button>
                        <button type="button" id="tab-card" class="payment-tab ${activePaymentTab === 'card' ? 'active' : ''}" role="tab" aria-selected="${activePaymentTab === 'card'}" aria-controls="panel-card">
                            <span class="material-symbols-outlined text-sm">credit_card</span> Credit Card
                        </button>
                    </div>

                    <!-- M-Pesa Panel -->
                    <div id="panel-mpesa" class="payment-method-panel ${activePaymentTab === 'mpesa' ? 'active' : ''}" role="tabpanel">
                        <div class="checkout-form-group">
                            <label class="checkout-form-label" for="checkout-mpesa-phone">M-Pesa Mobile Number</label>
                            <input type="tel" id="checkout-mpesa-phone" class="checkout-form-input" placeholder="e.g. 0712345678" required />
                            <span class="checkout-form-error" id="error-mpesa-phone">Valid Safaricom phone number required.</span>
                        </div>
                        <div class="payment-info-alert">
                            <span class="material-symbols-outlined payment-info-icon" style="font-size: 1.2rem;">info</span>
                            <span class="text-xs">We will trigger a Safaricom STK Push pop-up on this mobile number. Enter your M-Pesa PIN to complete payment.</span>
                        </div>
                    </div>

                    <!-- Credit Card Panel -->
                    <div id="panel-card" class="payment-method-panel ${activePaymentTab === 'card' ? 'active' : ''}" role="tabpanel">
                        <div class="checkout-form-group">
                            <label class="checkout-form-label" for="checkout-card-name">Cardholder Name</label>
                            <input type="text" id="checkout-card-name" class="checkout-form-input" placeholder="Idris Elba" required />
                            <span class="checkout-form-error" id="error-card-name">Cardholder name is required.</span>
                        </div>
                        <div class="checkout-form-group">
                            <label class="checkout-form-label" for="checkout-card-number">Card Number</label>
                            <div class="relative">
                                <input type="text" id="checkout-card-number" class="checkout-form-input pr-10" placeholder="4000 1234 5678 9010" maxlength="19" required />
                                <span id="card-type-icon" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-60">💳</span>
                            </div>
                            <span class="checkout-form-error" id="error-card-number">Valid 16-digit card number required.</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="checkout-form-group">
                                <label class="checkout-form-label" for="checkout-card-expiry">Expiry Date</label>
                                <input type="text" id="checkout-card-expiry" class="checkout-form-input" placeholder="MM/YY" maxlength="5" required />
                                <span class="checkout-form-error" id="error-card-expiry">Invalid.</span>
                            </div>
                            <div class="checkout-form-group">
                                <label class="checkout-form-label" for="checkout-card-cvv">CVV</label>
                                <input type="password" id="checkout-card-cvv" class="checkout-form-input" placeholder="123" maxlength="4" required />
                                <span class="checkout-form-error" id="error-card-cvv">3-4 digits.</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Secure transaction reassurance footer -->
                    <div class="mt-4 pt-3 border-t border-brand-charcoal/10 flex items-center justify-between text-xs text-brand-charcoal/60">
                        <span class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px] text-brand-green">verified_user</span>
                            Secure encrypted checkout
                        </span>
                        <span class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold text-[10px] tracking-wider border border-brand-green/20">M-PESA</span>
                            <span class="material-symbols-outlined text-[16px] opacity-75">lock</span>
                        </span>
                    </div>
                </div>
            `;

            // Prefill M-Pesa phone number if available in parent
            const phoneInput = document.getElementById('checkout-phone');
            const mpesaPhoneInput = document.getElementById('checkout-mpesa-phone');
            if (phoneInput && mpesaPhoneInput && !mpesaPhoneInput.value) {
                let val = phoneInput.value.trim().replace(/[\s-()]/g, '');
                if (val.startsWith('+254')) val = '0' + val.slice(4);
                else if (val.startsWith('254')) val = '0' + val.slice(3);
                mpesaPhoneInput.value = val;
            }

            // Wire Tabs inside container
            const tabMpesa = document.getElementById('tab-mpesa');
            const tabCard = document.getElementById('tab-card');
            const panelMpesa = document.getElementById('panel-mpesa');
            const panelCard = document.getElementById('panel-card');

            if (tabMpesa && tabCard) {
                tabMpesa.addEventListener('click', () => {
                    activePaymentTab = 'mpesa';
                    tabMpesa.classList.add('active');
                    tabCard.classList.remove('active');
                    panelMpesa.classList.add('active');
                    panelCard.classList.remove('active');
                });
                tabCard.addEventListener('click', () => {
                    activePaymentTab = 'card';
                    tabCard.classList.add('active');
                    tabMpesa.classList.remove('active');
                    panelCard.classList.add('active');
                    panelMpesa.classList.remove('active');
                });
            }

            // Format credit card inputs
            const cardNumEl = document.getElementById('checkout-card-number');
            if (cardNumEl) {
                cardNumEl.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                    let matches = value.match(/\d{4,16}/g);
                    let match = matches && matches[0] || '';
                    let parts = [];
                    for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                    }
                    e.target.value = parts.length > 0 ? parts.join(' ') : value;

                    const icon = document.getElementById('card-type-icon');
                    if (icon) {
                        if (value.startsWith('4')) icon.textContent = 'Visa 🔵';
                        else if (value.startsWith('5')) icon.textContent = 'MC 🔴';
                        else if (value.startsWith('3')) icon.textContent = 'Amex 🟢';
                        else icon.textContent = '💳';
                    }
                });
            }

            // Format card expiry
            const cardExpiryEl = document.getElementById('checkout-card-expiry');
            if (cardExpiryEl) {
                cardExpiryEl.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                    if (value.length >= 2) {
                        e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
                    } else {
                        e.target.value = value;
                    }
                });
            }
        } else if (val === 'cash_delivery') {
            paymentDetailsBox.innerHTML = `
                <div class="payment-info-alert mt-2">
                    <span class="material-symbols-outlined payment-info-icon" style="font-size: 1.2rem;">payments</span>
                    <span class="text-xs font-semibold">Pay with Cash, M-Pesa, or Card terminal when your fish is delivered to your address/room/table. No online pre-payment required.</span>
                </div>
            `;
        }
    }

    // Submit Checkout form
    function handleCheckoutSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const nameInput = document.getElementById('checkout-name');
        const phoneInput = document.getElementById('checkout-phone');
        const instructionsInput = document.getElementById('checkout-instructions');
        const paymentSelect = document.getElementById('checkout-payment');

        let isValid = true;

        // Reset errors
        form.querySelectorAll('.checkout-form-group').forEach(grp => grp.classList.remove('has-error'));

        // Validate common details
        if (!nameInput.value.trim()) {
            nameInput.closest('.checkout-form-group').classList.add('has-error');
            isValid = false;
        }

        const phoneVal = phoneInput.value.trim();
        if (!phoneVal || !/^\+?[0-9\s-]{7,15}$/.test(phoneVal)) {
            phoneInput.closest('.checkout-form-group').classList.add('has-error');
            isValid = false;
        }

        // Validate Contextual Details
        if (activeTab === 'delivery') {
            const addrInput = document.getElementById('checkout-address');
            if (addrInput && !addrInput.value.trim()) {
                addrInput.closest('.checkout-form-group').classList.add('has-error');
                isValid = false;
            }
        } else if (activeTab === 'takeaway') {
            const pickupInput = document.getElementById('checkout-pickup-time');
            if (pickupInput && !pickupInput.value) {
                pickupInput.closest('.checkout-form-group').classList.add('has-error');
                isValid = false;
            }
        } else if (activeTab === 'room_service') {
            const roomNoInput = document.getElementById('checkout-room');
            const roomLastNameInput = document.getElementById('checkout-room-lastname');
            const roomPinInput = document.getElementById('checkout-room-pin');

            if (roomNoInput && !roomNoInput.value.trim()) {
                roomNoInput.closest('.checkout-form-group').classList.add('has-error');
                isValid = false;
            }
            if (roomLastNameInput && !roomLastNameInput.value.trim()) {
                roomLastNameInput.closest('.checkout-form-group').classList.add('has-error');
                isValid = false;
            }
            if (roomPinInput) {
                const pin = roomPinInput.value.trim();
                if (!pin || !/^\d{4}$/.test(pin)) {
                    roomPinInput.closest('.checkout-form-group').classList.add('has-error');
                    isValid = false;
                }
            }
        } else if (activeTab === 'dine_in') {
            const tableInput = document.getElementById('checkout-table');
            if (tableInput && !tableInput.value) {
                tableInput.closest('.checkout-form-group').classList.add('has-error');
                isValid = false;
            }
        }

        // Validate Online Payments details if applicable
        const payOption = paymentSelect.value;
        if (payOption === 'card_online') {
            if (activePaymentTab === 'mpesa') {
                const mpesaPhoneInput = document.getElementById('checkout-mpesa-phone');
                if (mpesaPhoneInput) {
                    const mpVal = mpesaPhoneInput.value.trim().replace(/[\s-()]/g, '');
                    if (!/^(?:07|01)\d{8}$/.test(mpVal) && !/^(?:\+254|254)(?:7|1)\d{8}$/.test(mpVal)) {
                        mpesaPhoneInput.closest('.checkout-form-group').classList.add('has-error');
                        isValid = false;
                    }
                }
            } else if (activePaymentTab === 'card') {
                const cardNameInput = document.getElementById('checkout-card-name');
                const cardNumberInput = document.getElementById('checkout-card-number');
                const cardExpiryInput = document.getElementById('checkout-card-expiry');
                const cardCvvInput = document.getElementById('checkout-card-cvv');

                if (cardNameInput && !cardNameInput.value.trim()) {
                    cardNameInput.closest('.checkout-form-group').classList.add('has-error');
                    isValid = false;
                }
                if (cardNumberInput && !/^\d{16}$/.test(cardNumberInput.value.replace(/\s+/g, ''))) {
                    cardNumberInput.closest('.checkout-form-group').classList.add('has-error');
                    isValid = false;
                }
                if (cardExpiryInput && !/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(cardExpiryInput.value.trim())) {
                    cardExpiryInput.closest('.checkout-form-group').classList.add('has-error');
                    isValid = false;
                }
                if (cardCvvInput && !/^\d{3,4}$/.test(cardCvvInput.value.trim())) {
                    cardCvvInput.closest('.checkout-form-group').classList.add('has-error');
                    isValid = false;
                }
            }
        }

        if (!isValid) return;

        // Initiate Simulation Overlay
        const checkoutMain = document.getElementById('checkout-main-content');
        const successView = document.getElementById('checkout-success-view');

        const simOverlay = document.createElement('div');
        simOverlay.className = 'checkout-simulation-overlay';
        simOverlay.style.position = 'fixed';
        document.body.appendChild(simOverlay);

        function updateSimStatus(message, loaderHtml = '<div class="sim-loader"></div>', progressPercent = null) {
            let progressHtml = '';
            if (progressPercent !== null) {
                progressHtml = `
                    <div class="sim-progress-track">
                        <div class="sim-progress-bar" style="width: ${progressPercent}%;"></div>
                    </div>
                `;
            }
            simOverlay.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full w-full max-w-sm mx-auto">
                    ${loaderHtml}
                    <h3 class="font-headline font-bold text-lg mb-2 text-brand-charcoal">${message}</h3>
                    ${progressHtml}
                </div>
            `;
        }

        // Run Processing steps
        const totalBill = cart.reduce((sum, item) => {
            const dish = (window.MENU_ITEMS || []).find(d => d.id === item.id);
            return sum + (dish ? dish.priceValue : 0) * item.quantity;
        }, 0) + deliveryFee;

        // ── Real API Server Route Connection ─────────────────────────────────
        if (USE_REAL_BACKEND) {
            submitRealOrder(payOption, totalBill, simOverlay, updateSimStatus, completeOrder);
            return;
        }

        if (payOption === 'room_charge') {
            const roomVal = document.getElementById('checkout-room').value.trim();
            const lastNameVal = document.getElementById('checkout-room-lastname').value.trim();
            
            updateSimStatus("Authenticating room service connection...", '<div class="sim-loader"></div>', 25);
            setTimeout(() => {
                updateSimStatus(`Verifying room allocation for Guest "${lastNameVal}" in Room ${roomVal}...`, '<div class="sim-loader"></div>', 60);
            }, 1500);
            setTimeout(() => {
                updateSimStatus("✓ Guest identity confirmed. Posting charge to room bill...", '<span class="material-symbols-outlined text-brand-green text-5xl mb-4">task_alt</span>', 90);
            }, 3000);
            setTimeout(() => {
                completeOrder();
            }, 4500);
        } else if (payOption === 'card_online') {
            if (activePaymentTab === 'mpesa') {
                const mpesaPhone = document.getElementById('checkout-mpesa-phone').value.trim();
                updateSimStatus("Contacting Safaricom M-Pesa Gateway...", '<div class="sim-loader"></div>', 20);

                setTimeout(() => {
                    let countdown = 12;
                    const interval = setInterval(() => {
                        countdown--;
                        if (countdown <= 0) {
                            clearInterval(interval);
                            return;
                        }
                        if (countdown > 5) {
                            updateSimStatus(
                                `STK Push sent to ${mpesaPhone}.<br><span class="text-xs opacity-75 mt-2 block font-normal">Check your device SIM prompt and enter your M-Pesa PIN.</span>`,
                                '<span class="material-symbols-outlined sim-phone-pulse">phone_iphone</span>',
                                Math.min(100, 20 + (12 - countdown) * 6)
                            );
                        } else if (countdown === 5) {
                            clearInterval(interval);
                            updateSimStatus("✓ PIN Verified successfully. Processing receipt...", '<div class="sim-loader"></div>', 85);
                            setTimeout(() => {
                                updateSimStatus("✓ Safaricom Payment Confirmed.", '<span class="material-symbols-outlined text-brand-green text-5xl mb-4">task_alt</span>', 95);
                            }, 1500);
                            setTimeout(() => {
                                completeOrder();
                            }, 3000);
                        }
                    }, 1000);
                }, 1500);
            } else {
                // Card processing
                updateSimStatus("Securing card gateway socket...", '<div class="sim-loader"></div>', 20);
                setTimeout(() => {
                    updateSimStatus(`Initiating secure payment authorization of KES ${totalBill.toLocaleString()}...`, '<div class="sim-loader"></div>', 50);
                }, 1500);
                setTimeout(() => {
                    simOverlay.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full w-full max-w-sm mx-auto">
                            <div class="sim-secure-modal">
                                <span class="material-symbols-outlined text-4xl text-brand-terracotta">lock</span>
                                <div class="sim-secure-title">Verified by Visa</div>
                                <p class="text-xs opacity-80">We have sent a verification code to your registered mobile number ending in *58.</p>
                                <div class="flex gap-2 items-center justify-center mt-2">
                                    <input type="text" placeholder="------" class="checkout-form-input text-center text-lg font-bold tracking-widest max-w-[140px] px-2 py-1.5" maxlength="6" id="otp-sim-input" readonly />
                                    <button type="button" id="otp-sim-submit" class="bg-brand-terracotta text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-opacity-95">Submit</button>
                                </div>
                                <p class="text-[9px] opacity-60">Mock 3D Secure. Simulating autocomplete...</p>
                            </div>
                        </div>
                    `;

                    const otpInput = document.getElementById('otp-sim-input');
                    const otpSubmitBtn = document.getElementById('otp-sim-submit');
                    setTimeout(() => {
                        let otp = "920485";
                        let typed = "";
                        let i = 0;
                        const typeInterval = setInterval(() => {
                            typed += otp[i];
                            if (otpInput) otpInput.value = typed;
                            i++;
                            if (i >= otp.length) {
                                clearInterval(typeInterval);
                                setTimeout(() => {
                                    if (otpSubmitBtn) otpSubmitBtn.click();
                                }, 500);
                            }
                        }, 200);
                    }, 800);

                    if (otpSubmitBtn) {
                        otpSubmitBtn.addEventListener('click', () => {
                            updateSimStatus("✓ OTP Verified. Capturing payment authorization...", '<div class="sim-loader"></div>', 90);
                            setTimeout(() => {
                                completeOrder();
                            }, 1500);
                        });
                    }
                }, 3000);
            }
        } else if (payOption === 'cash_delivery') {
            updateSimStatus("Routing delivery driver coordinates...", '<div class="sim-loader"></div>', 50);
            setTimeout(() => {
                updateSimStatus("✓ Route confirmed. Cooking has started.", '<span class="material-symbols-outlined text-brand-green text-5xl mb-4">task_alt</span>', 90);
            }, 1500);
            setTimeout(() => {
                completeOrder();
            }, 3000);
        }

        // Finalize order creation and display success
        function completeOrder(customOrderId = null, customPaymentDetail = null) {
            const orderId = customOrderId || 'MO-' + Math.floor(100000 + Math.random() * 900000);
            let displayAddress = 'N/A';
            let orderTypeDisplay = 'Home Delivery';

            if (activeTab === 'delivery') {
                displayAddress = document.getElementById('checkout-address').value.trim() + `, Area: ` + document.getElementById('checkout-delivery-area').value;
            } else if (activeTab === 'takeaway') {
                orderTypeDisplay = 'Takeaway / Pickup';
                displayAddress = `Collect at restaurant counter. Time: ` + document.getElementById('checkout-pickup-time').value;
            } else if (activeTab === 'room_service') {
                orderTypeDisplay = 'Room Service';
                displayAddress = `Room ` + document.getElementById('checkout-room').value.trim();
            } else if (activeTab === 'dine_in') {
                orderTypeDisplay = 'Dine-In Table Service';
                displayAddress = `Table Number: ` + document.getElementById('checkout-table').value.trim();
            }

            const paymentDisplay = customPaymentDetail || (payOption === 'room_charge' ? 'Charge to Room' : (payOption === 'card_online' ? (activePaymentTab === 'mpesa' ? 'M-Pesa Express' : 'Credit Card') : 'Cash/Card on Delivery'));

            const orderDetails = {
                orderId: orderId,
                name: nameInput.value.trim(),
                phone: phoneInput.value.trim(),
                orderType: activeTab,
                orderTypeLabel: orderTypeDisplay,
                address: displayAddress,
                paymentDetail: paymentDisplay,
                instructions: instructionsInput.value.trim(),
                items: cart.map(item => {
                    const dish = (window.MENU_ITEMS || []).find(d => d.id === item.id);
                    return {
                        id: item.id,
                        name: dish ? dish.name : item.id,
                        price: dish ? dish.priceValue : 0,
                        quantity: item.quantity
                    };
                }),
                total: totalBill,
                status: 'Pending',
                timestamp: new Date().toISOString()
            };

            // Write order to localStorage log history
            let history = [];
            const savedHistory = localStorage.getItem('mo_orders');
            if (savedHistory) {
                try { history = JSON.parse(savedHistory); } catch (e) { history = []; }
            }
            history.push(orderDetails);
            localStorage.setItem('mo_orders', JSON.stringify(history));

            // Clear Cart state
            localStorage.removeItem('mo_cart');

            // Hide simulation overlay
            if (simOverlay.parentNode) {
                simOverlay.parentNode.removeChild(simOverlay);
            }

            // Hide main content
            if (checkoutMain) checkoutMain.classList.add('hidden');

            // Show Success UI
            if (successView) {
                successView.classList.remove('hidden');
                successView.classList.add('active');
                successView.innerHTML = `
                    <div class="bg-white p-8 md:p-12 rounded-2xl border border-brand-charcoal/5 shadow-2xl text-center max-w-lg mx-auto">
                        <div class="success-checkmark mb-6">
                            <span class="material-symbols-outlined text-brand-green text-5xl">check_circle</span>
                        </div>
                        <h2 class="font-headline font-bold text-3xl text-brand-charcoal mb-2">Order Confirmed!</h2>
                        <p class="text-brand-green font-semibold text-sm mb-6">Your Tilapia and traditional sides are now being prepared.</p>
                        
                        <div class="bg-brand-bg rounded-xl p-5 text-left flex flex-col gap-2.5 border border-border-color text-xs mb-8">
                            <div class="flex justify-between border-b border-brand-charcoal/5 pb-2">
                                <span class="opacity-70">Order ID:</span>
                                <span class="font-bold text-brand-charcoal">${orderId}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">Customer Name:</span>
                                <span class="font-semibold text-brand-charcoal">${orderDetails.name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">Service Channel:</span>
                                <span class="font-bold text-brand-terracotta">${orderDetails.orderTypeLabel}</span>
                            </div>
                            <div class="flex justify-between items-start">
                                <span class="opacity-70">Location Details:</span>
                                <span class="font-semibold text-brand-charcoal text-right max-w-[180px] truncate" title="${orderDetails.address}">${orderDetails.address}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">Payment Method:</span>
                                <span class="font-semibold text-brand-charcoal">${orderDetails.paymentDetail}</span>
                            </div>
                            <div class="flex justify-between border-t border-brand-charcoal/5 pt-2 font-bold text-sm">
                                <span class="text-brand-charcoal">Amount Paid:</span>
                                <span class="text-brand-terracotta">KES ${orderDetails.total.toLocaleString()}</span>
                            </div>
                        </div>

                        <button type="button" id="btn-success-home" class="bg-brand-green text-white w-full py-4 rounded-xl font-semibold text-base hover:bg-brand-green-hover transition-all flex justify-center items-center gap-2">
                            <span class="material-symbols-outlined">restaurant</span> Back to Menu
                        </button>
                    </div>
                `;

                const homeBtn = document.getElementById('btn-success-home');
                if (homeBtn) {
                    homeBtn.addEventListener('click', () => {
                        window.location.href = 'menu.html';
                    });
                }
            }
        }
    }

    // submitRealOrder - Real backend API caller & Status poller
    function submitRealOrder(payOption, totalBill, simOverlay, updateSimStatus, completeOrderCallback) {
        const nameInput = document.getElementById('checkout-name');
        const phoneInput = document.getElementById('checkout-phone');
        const instructionsInput = document.getElementById('checkout-instructions');
        
        let payload = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            instructions: instructionsInput.value.trim(),
            total: totalBill,
            orderType: activeTab,
            items: cart.map(item => {
                const dish = (window.MENU_ITEMS || []).find(d => d.id === item.id);
                return {
                    id: item.id,
                    name: dish ? dish.name : item.id,
                    price: dish ? dish.priceValue : 0,
                    quantity: item.quantity
                };
            })
        };

        // Context-specific payloads
        if (activeTab === 'delivery') {
            payload.deliveryAddress = document.getElementById('checkout-address').value.trim();
            payload.deliveryArea = document.getElementById('checkout-delivery-area').value;
        } else if (activeTab === 'takeaway') {
            payload.pickupTime = document.getElementById('checkout-pickup-time').value;
        } else if (activeTab === 'room_service') {
            payload.room = document.getElementById('checkout-room').value.trim();
            payload.guestLastName = document.getElementById('checkout-room-lastname').value.trim();
            payload.roomPin = document.getElementById('checkout-room-pin').value.trim();
        } else if (activeTab === 'dine_in') {
            payload.tableNumber = document.getElementById('checkout-table').value.trim();
        }

        if (payOption === 'card_online' && activePaymentTab === 'mpesa') {
            // M-Pesa Real Integration Flow
            payload.mpesaPhone = document.getElementById('checkout-mpesa-phone').value.trim();
            updateSimStatus("Contacting Safaricom M-Pesa Gateway...", '<div class="sim-loader"></div>', 20);

            fetch(`${BACKEND_URL}/api/payments/stkpush`, {
                method: 'POST',
                headers: (window.Auth && window.Auth.isLoggedIn())
                    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.Auth.getToken()}` }
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) throw new Error('Payment initiation failed.');
                return res.json();
            })
            .then(data => {
                const orderId = data.orderId;
                let pollAttempts = 0;
                
                updateSimStatus(
                    `STK Push sent to ${payload.mpesaPhone}.<br><span class="text-xs opacity-75 mt-2 block font-normal">Check your phone and enter your M-Pesa PIN.</span>`,
                    '<span class="material-symbols-outlined sim-phone-pulse">phone_iphone</span>',
                    40
                );

                const pollInterval = setInterval(() => {
                    pollAttempts++;
                    if (pollAttempts > 30) {
                        clearInterval(pollInterval);
                        updateSimStatus("Transaction timed out. Check your M-Pesa status or retry.", '<span class="material-symbols-outlined text-red-600 text-5xl mb-4">error</span>', 100);
                        setTimeout(() => simOverlay.remove(), 3000);
                        return;
                    }

                    fetch(`${BACKEND_URL}/api/payments/order/${orderId}/status`)
                    .then(res => res.json())
                    .then(order => {
                        if (order.status === 'Confirmed') {
                            clearInterval(pollInterval);
                            updateSimStatus("✓ Payment Confirmed. Cooking started!", '<span class="material-symbols-outlined text-brand-green text-5xl mb-4">task_alt</span>', 100);
                            setTimeout(() => {
                                completeOrderCallback(orderId, order.payment_detail);
                            }, 1500);
                        } else if (order.payment_detail && order.payment_detail.includes('Failed')) {
                            clearInterval(pollInterval);
                            updateSimStatus("Payment failed. Please retry.", '<span class="material-symbols-outlined text-red-600 text-5xl mb-4">error</span>', 100);
                            setTimeout(() => simOverlay.remove(), 2500);
                        }
                    });
                }, 2000);
            })
            .catch(err => {
                console.error(err);
                updateSimStatus("Failed to contact M-Pesa server. Please try again.", '<span class="material-symbols-outlined text-red-600 text-5xl mb-4">error</span>', 100);
                setTimeout(() => simOverlay.remove(), 2500);
            });
        } else {
            // Direct Order Flow (Cash on Delivery or Room Charge)
            payload.paymentMethod = payOption;
            payload.paymentDetail = payOption === 'room_charge' ? 'Charge to Room' : 'Cash/Card on Delivery';

            updateSimStatus("Routing order coordinates to backend...", '<div class="sim-loader"></div>', 40);

            fetch(`${BACKEND_URL}/api/payments/direct-order`, {
                method: 'POST',
                headers: (window.Auth && window.Auth.isLoggedIn())
                    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.Auth.getToken()}` }
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) throw new Error('Order creation failed.');
                return res.json();
            })
            .then(data => {
                updateSimStatus("✓ Order recorded in backend database.", '<span class="material-symbols-outlined text-brand-green text-5xl mb-4">task_alt</span>', 100);
                setTimeout(() => {
                    completeOrderCallback(data.order.id, data.order.payment_detail);
                }, 1500);
            })
            .catch(err => {
                console.error(err);
                updateSimStatus("Connection failed. Order not saved in database.", '<span class="material-symbols-outlined text-red-600 text-5xl mb-4">error</span>', 100);
                setTimeout(() => simOverlay.remove(), 2500);
            });
        }
    }

    // Expose dynamically
    window.Checkout = {
        init: init
    };

    // Auto initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
