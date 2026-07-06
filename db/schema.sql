-- db/schema.sql
-- Mama Oliech Restaurant Database Schema (MySQL Dialect)

-- 1. DISHES (Product Catalog)
CREATE TABLE IF NOT EXISTS dishes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price VARCHAR(50) NOT NULL, -- Display price (e.g. "KES 1,200")
    price_value DECIMAL(10, 2) NOT NULL, -- Decimal value for calculations
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    badge VARCHAR(100),
    is_spicy BOOLEAN DEFAULT false,
    allergens VARCHAR(255) DEFAULT 'None',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_dish_category CHECK (category IN ('fish', 'sides', 'drinks')),
    INDEX idx_dishes_category (category)
);

-- 2. TABLE RESERVATIONS
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(100) PRIMARY KEY, -- BK-xxxxxxxxxx format
    guest_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(100) NOT NULL,
    num_guests INT NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    special_requests VARCHAR(1000) DEFAULT 'None',
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_res_guests CHECK (num_guests > 0 AND num_guests <= 500),
    CONSTRAINT chk_res_status CHECK (status IN ('pending', 'confirmed', 'completed')),
    INDEX idx_reservations_date (reservation_date)
);

-- 3. FOOD & ROOM SERVICE ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY, -- MO-xxxxxxxxxx format
    guest_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50), -- Nullable: only for Room Service
    phone_number VARCHAR(100) NOT NULL,
    order_type VARCHAR(50) DEFAULT 'delivery',
    delivery_address TEXT, -- For delivery orders
    delivery_area VARCHAR(100), -- For delivery orders (e.g. Kilimani, Westlands)
    table_number VARCHAR(50), -- For dine-in orders
    pickup_time TIME, -- For takeaway orders
    payment_method VARCHAR(50) NOT NULL,
    payment_detail VARCHAR(100), -- e.g. "M-Pesa Express", "Credit Card"
    special_instructions TEXT,
    items JSON NOT NULL, -- Array of items: [{id, name, price, quantity}]
    total_price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_order_type CHECK (order_type IN ('delivery', 'takeaway', 'room_service', 'dine_in')),
    CONSTRAINT chk_order_payment CHECK (payment_method IN ('room_charge', 'card_online', 'cash_delivery')),
    CONSTRAINT chk_order_price CHECK (total_price >= 0),
    CONSTRAINT chk_order_status CHECK (status IN ('Pending', 'Confirmed', 'Cooking', 'Dispatched', 'Completed')),
    INDEX idx_orders_status (status)
);



-- 4. M-PESA TRANSACTION LOGS
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    checkout_request_id VARCHAR(100) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    receipt_number VARCHAR(100),
    payment_amount DECIMAL(10, 2),
    sender_phone VARCHAR(50),
    error_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mpesa_tx_order (order_id)
);



-- 5. STAFF USERS (Authentication & MFA)
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    mfa_secret VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

