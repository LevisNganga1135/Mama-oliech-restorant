const request = require('supertest');
const app = require('../server');

// Mock Knex query builder
jest.mock('../db/db', () => {
    const mockKnex = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        first: jest.fn()
    };
    const mockDb = jest.fn(() => mockKnex);
    mockDb.fn = {
        now: jest.fn(() => 'MOCK_NOW')
    };
    return mockDb;
});

const pool = require('../db/db');

describe('POST /api/payments/direct-order', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const validOrderBase = {
        name: 'Jane Doe',
        phone: '+254 711 222333',
        items: [{ id: 'tilapia-dry', name: 'Whole Tilapia (Dry Fry)', price: 'KES 1,200', quantity: 1 }],
        total: 1200,
        paymentMethod: 'cash_delivery'
    };

    it('should successfully create a direct delivery order and return 201', async () => {
        const mockOrder = {
            id: 'MO-123456',
            guest_name: 'Jane Doe',
            phone_number: '+254 711 222333',
            order_type: 'delivery',
            delivery_address: 'Kilimani, Ring Road',
            delivery_area: 'Kilimani',
            total_price: 1200.00,
            status: 'Pending'
        };

        const mockKnex = pool();
        mockKnex.first.mockResolvedValueOnce(mockOrder);

        const res = await request(app)
            .post('/api/payments/direct-order')
            .send({
                ...validOrderBase,
                orderType: 'delivery',
                deliveryAddress: 'Kilimani, Ring Road',
                deliveryArea: 'Kilimani'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('message', 'Order created successfully.');
        expect(res.body.order).toEqual(mockOrder);
        expect(pool).toHaveBeenCalledWith('orders');
        expect(mockKnex.insert).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if core checkout details are missing', async () => {
        const res = await request(app)
            .post('/api/payments/direct-order')
            .send({
                name: 'Jane Doe',
                // phone is missing
                items: [],
                total: 0
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Missing core checkout details, payment method, or order items.');
        expect(pool).not.toHaveBeenCalled();
    });

    it('should validate room number is required for room service', async () => {
        const res = await request(app)
            .post('/api/payments/direct-order')
            .send({
                ...validOrderBase,
                orderType: 'room_service',
                paymentMethod: 'room_charge'
                // room is missing
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Room number is required for room service orders.');
        expect(pool).not.toHaveBeenCalled();
    });

    it('should validate table number is required for dine-in', async () => {
        const res = await request(app)
            .post('/api/payments/direct-order')
            .send({
                ...validOrderBase,
                orderType: 'dine_in'
                // tableNumber is missing
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Table number is required for dine-in orders.');
        expect(pool).not.toHaveBeenCalled();
    });

    it('should validate pickup time is required for takeaway', async () => {
        const res = await request(app)
            .post('/api/payments/direct-order')
            .send({
                ...validOrderBase,
                orderType: 'takeaway'
                // pickupTime is missing
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Pickup time is required for takeaway orders.');
        expect(pool).not.toHaveBeenCalled();
    });
});
