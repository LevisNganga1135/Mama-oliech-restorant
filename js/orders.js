/**
 * orders.js — Mama Oliech Restaurant Staff Portal (Food Orders Dashboard)
 * Drives the food orders management panel in staff-panel.html
 */

'use strict';

(function () {
    const BACKEND_URL = window.MAMA_OLIECH_API_URL || (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
            ? 'http://localhost:5000'
            : ''
    );

    let _ordersRefs = null;
    let _activeTab = 'reservations'; // 'reservations' | 'orders'
    let _pollingTimer = null;

    // Initialize Orders Panel Hook
    function init() {
        wireTabSwitcher();
        initOrderControls();
        startPolling();
    }

    function getOrdersRefs() {
        if (_ordersRefs) return _ordersRefs;
        _ordersRefs = {
            tbody: document.getElementById('orders-dashboard-body'),
            totalCount: document.getElementById('total-orders'),
            cookingCount: document.getElementById('cooking-orders'),
            totalRevenue: document.getElementById('total-revenue'),
            searchInput: document.getElementById('search-order'),
            statusFilter: document.getElementById('filter-order-status'),
            ordersSection: document.getElementById('orders-section'),
            reservationsSection: document.getElementById('reservations-section'),
            tabReservations: document.getElementById('tab-btn-reservations'),
            tabOrders: document.getElementById('tab-btn-orders'),
            dashboardTitle: document.querySelector('.dashboard-header h2'),
            dashboardSubtitle: document.querySelector('.dashboard-header p')
        };
        return _ordersRefs;
    }

    // Tab Switcher wiring
    function wireTabSwitcher() {
        const refs = getOrdersRefs();
        if (!refs.tabReservations || !refs.tabOrders) return;

        refs.tabReservations.addEventListener('click', () => switchTab('reservations'));
        refs.tabOrders.addEventListener('click', () => switchTab('orders'));
    }

    function switchTab(tab) {
        const refs = getOrdersRefs();
        _activeTab = tab;

        if (tab === 'reservations') {
            // Visual Tab State
            refs.tabReservations.className = 'font-headline text-lg font-bold pb-2 border-b-2 border-brand-terracotta text-brand-terracotta';
            refs.tabOrders.className = 'font-headline text-lg font-bold pb-2 border-b-2 border-transparent text-brand-charcoal/60 hover:text-brand-terracotta transition-all';
            
            // Section visibility
            refs.reservationsSection.style.display = '';
            refs.ordersSection.style.display = 'none';

            // Title
            refs.dashboardTitle.textContent = 'Reservation Dashboard';
            refs.dashboardSubtitle.textContent = 'Track, verify, and complete table bookings submitted by guests.';
        } else {
            // Visual Tab State
            refs.tabOrders.className = 'font-headline text-lg font-bold pb-2 border-b-2 border-brand-terracotta text-brand-terracotta';
            refs.tabReservations.className = 'font-headline text-lg font-bold pb-2 border-b-2 border-transparent text-brand-charcoal/60 hover:text-brand-terracotta transition-all';

            // Section visibility
            refs.reservationsSection.style.display = 'none';
            refs.ordersSection.style.display = '';

            // Title
            refs.dashboardTitle.textContent = 'Food & Room Service Orders';
            refs.dashboardSubtitle.textContent = 'Monitor incoming checkout orders, manage cooking stages, and view payment details.';
            
            // Render immediately on tab switch
            renderOrdersDashboard();
        }
    }

    function initOrderControls() {
        const refs = getOrdersRefs();
        if (!refs.tbody) return;

        if (refs.searchInput) {
            refs.searchInput.addEventListener('input', renderOrdersDashboard);
        }
        if (refs.statusFilter) {
            refs.statusFilter.addEventListener('change', renderOrdersDashboard);
        }
    }

    // Start Polling for real-time kitchen tracking (refreshes every 10 seconds)
    function startPolling() {
        if (_pollingTimer) clearInterval(_pollingTimer);
        _pollingTimer = setInterval(() => {
            if (_activeTab === 'orders') {
                renderOrdersDashboard(true); // silent refresh (doesn't wipe loading indicator)
            }
        }, 10000);
    }

    // Main Renderer
    function renderOrdersDashboard(isSilent = false) {
        const refs = getOrdersRefs();
        if (!refs.tbody) return;

        if (!isSilent) {
            refs.tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 opacity-75">Loading food orders...</td></tr>`;
        }

        fetch(`${BACKEND_URL}/api/orders`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('mo_staff_auth') || ''}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch orders');
                return res.json();
            })
            .then(all => {
                // Apply filters
                const query = refs.searchInput ? refs.searchInput.value.trim().toLowerCase() : '';
                const status = refs.statusFilter ? refs.statusFilter.value : 'all';

                const filtered = all.filter(order => {
                    const matchesStatus = status === 'all' || order.status.toLowerCase() === status.toLowerCase();
                    const matchesQuery = !query ||
                        order.guest_name.toLowerCase().includes(query) ||
                        order.phone_number.includes(query) ||
                        order.id.toLowerCase().includes(query) ||
                        (order.room_number && order.room_number.toLowerCase().includes(query)) ||
                        (order.table_number && order.table_number.toLowerCase().includes(query)) ||
                        (order.delivery_address && order.delivery_address.toLowerCase().includes(query));
                    return matchesStatus && matchesQuery;
                });

                updateOrderStats(all);
                renderOrderTableBody(refs.tbody, filtered);
            })
            .catch(err => {
                console.error('💥 Error rendering orders dashboard:', err);
                if (!isSilent) {
                    refs.tbody.innerHTML = `<tr><td colspan="7" class="no-bookings py-8 text-red-600">Failed to load orders from server. Ensure API is online.</td></tr>`;
                }
            });
    }

    function updateOrderStats(all) {
        const refs = getOrdersRefs();

        if (refs.totalCount) {
            refs.totalCount.textContent = all.length;
        }

        if (refs.cookingCount) {
            const cooking = all.filter(o => o.status === 'Cooking' || o.status === 'Confirmed').length;
            refs.cookingCount.textContent = cooking;
        }

        if (refs.totalRevenue) {
            // Only sum revenues for paid/confirmed/completed orders
            const revenue = all
                .filter(o => o.status !== 'Pending')
                .reduce((sum, o) => sum + parseFloat(o.total_price), 0);
            refs.totalRevenue.textContent = `KES ${revenue.toLocaleString()}`;
        }
    }

    function renderOrderTableBody(tbody, list) {
        const fragment = document.createDocumentFragment();

        if (list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" class="no-bookings">No food orders found matching the filter criteria.</td>`;
            fragment.appendChild(tr);
            tbody.innerHTML = '';
            tbody.appendChild(fragment);
            return;
        }

        list.forEach(order => {
            const tr = document.createElement('tr');

            // Format timestamp
            const dateObj = new Date(order.created_at);
            const timeLabel = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Parse items JSON
            let itemsHtml = '';
            try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                itemsHtml = items.map(i => `${i.quantity} x ${escapeHtml(i.name)}`).join('<br>');
            } catch (e) {
                itemsHtml = 'Error parsing items';
            }

            // Construct service location summary
            let locationDetail = '';
            if (order.order_type === 'delivery') {
                locationDetail = `<strong>Delivery:</strong> ${escapeHtml(order.delivery_area)}<br><span class="text-xs opacity-75">${escapeHtml(order.delivery_address)}</span>`;
            } else if (order.order_type === 'room_service') {
                locationDetail = `<strong>Room Service:</strong> Room ${escapeHtml(order.room_number)}`;
            } else if (order.order_type === 'dine_in') {
                locationDetail = `<strong>Dine-In:</strong> Table ${escapeHtml(order.table_number)}`;
            } else if (order.order_type === 'takeaway') {
                locationDetail = `<strong>Takeaway:</strong> Pickup ${escapeHtml(order.pickup_time || 'N/A')}`;
            }

            // Action Buttons based on status state machine
            let actionButtons = '';
            const safeId = escapeAttr(order.id);
            const status = order.status;

            if (status === 'Pending') {
                actionButtons += `<button class="action-btn confirm-btn" onclick="window.Orders.updateStatus('${safeId}','Confirmed')">Confirm</button>`;
            } else if (status === 'Confirmed') {
                actionButtons += `<button class="action-btn" style="background-color: var(--brand-gold); color: black;" onclick="window.Orders.updateStatus('${safeId}','Cooking')">Start Cooking</button>`;
            } else if (status === 'Cooking') {
                actionButtons += `<button class="action-btn" style="background-color: var(--brand-green); color: white;" onclick="window.Orders.updateStatus('${safeId}','Dispatched')">Dispatch</button>`;
            } else if (status === 'Dispatched') {
                actionButtons += `<button class="action-btn" onclick="window.Orders.updateStatus('${safeId}','Completed')">Complete</button>`;
            }
            actionButtons += `<button class="action-btn delete-btn" onclick="window.Orders.deleteOrder('${safeId}')">Delete</button>`;

            tr.innerHTML = `
                <td>
                    <span style="font-weight:700;color:var(--brand-terracotta);font-size:0.85rem;">${escapeHtml(order.id)}</span>
                    <br><span class="text-[10px] opacity-75">${escapeHtml(timeLabel)}</span>
                </td>
                <td>
                    <div style="font-weight:600;">${escapeHtml(order.guest_name)}</div>
                    <div style="font-size:0.8rem;opacity:0.65;">${escapeHtml(order.phone_number)}</div>
                </td>
                <td style="font-size:0.85rem;">
                    ${locationDetail}
                </td>
                <td style="font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;">
                    ${itemsHtml}
                </td>
                <td>
                    <div style="font-weight:700;">KES ${parseFloat(order.total_price).toLocaleString()}</div>
                    <div style="font-size:0.75rem;opacity:0.75;" title="${escapeAttr(order.payment_detail)}">
                        ${escapeHtml(order.payment_method === 'room_charge' ? 'Room Charge' : order.payment_method === 'card_online' ? 'Paid Online' : 'Cash/COD')}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${escapeAttr(status.toLowerCase())}">${escapeHtml(status)}</span>
                </td>
                <td>
                    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                        ${actionButtons}
                    </div>
                </td>
            `;

            fragment.appendChild(tr);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }

    // State machine updates
    function updateOrderStatus(id, newStatus) {
        fetch(`${BACKEND_URL}/api/orders/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('mo_staff_auth') || ''}`
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to update status');
            renderOrdersDashboard(true);
        })
        .catch(err => {
            console.error('💥 Error updating order status:', err);
            alert('Failed to update order status. Check connection.');
        });
    }

    // Delete order
    function deleteOrder(id) {
        const confirmed = window.confirm(`Delete order ${id} from database? This action cannot be undone.`);
        if (!confirmed) return;

        fetch(`${BACKEND_URL}/api/orders/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('mo_staff_auth') || ''}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete order');
            renderOrdersDashboard(true);
        })
        .catch(err => {
            console.error('💥 Error deleting order:', err);
            alert('Failed to delete order.');
        });
    }

    // Helper functions
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Expose window interfaces
    window.Orders = {
        init: init,
        updateStatus: updateOrderStatus,
        deleteOrder: deleteOrder,
        refresh: renderOrdersDashboard
    };

    // Auto run on load
    document.addEventListener('DOMContentLoaded', () => {
        const refs = getOrdersRefs();
        if (refs.tbody) {
            init();
        }
    });

})();
