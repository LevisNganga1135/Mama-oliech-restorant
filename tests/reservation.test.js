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

describe('POST /api/reservations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully create a reservation and return 201', async () => {
        const mockReservation = {
            id: 'BK-1234567890',
            guest_name: 'John Doe',
            phone_number: '+254 712 345678',
            num_guests: 4,
            reservation_date: '2026-07-10',
            reservation_time: '19:30:00',
            special_requests: 'None',
            status: 'pending'
        };

        const mockKnex = pool();
        mockKnex.first.mockResolvedValueOnce(mockReservation);

        const res = await request(app)
            .post('/api/reservations')
            .send({
                name: 'John Doe',
                phone: '+254 712 345678',
                size: 4,
                date: '2026-07-10',
                time: '19:30',
                requests: 'None'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('message', 'Reservation created successfully.');
        expect(res.body.reservation).toEqual(mockReservation);
        expect(pool).toHaveBeenCalledWith('reservations');
        expect(mockKnex.insert).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if required fields are missing', async () => {
        const res = await request(app)
            .post('/api/reservations')
            .send({
                name: 'John Doe',
                // phone is missing
                size: 4,
                date: '2026-07-10',
                time: '19:30'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Missing required reservation fields (name, phone, size, date, time).');
        expect(pool).not.toHaveBeenCalled();
    });

    it('should return 400 if guest size is invalid', async () => {
        const res = await request(app)
            .post('/api/reservations')
            .send({
                name: 'John Doe',
                phone: '+254 712 345678',
                size: 600, // max is 500 in schema constraints
                date: '2026-07-10',
                time: '19:30'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Guest count must be between 1 and 500.');
        expect(pool).not.toHaveBeenCalled();
    });
});
