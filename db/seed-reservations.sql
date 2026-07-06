-- db/seed-reservations.sql
-- Seed script to populate reservations table with realistic data for Mama Oliech Restaurant

-- Clear existing data if you want a clean slate (optional, commented out for safety)
-- TRUNCATE TABLE reservations CASCADE;

INSERT INTO reservations (
    id, 
    guest_name, 
    phone_number, 
    num_guests, 
    reservation_date, 
    reservation_time, 
    special_requests, 
    status, 
    created_at, 
    updated_at
) VALUES
-- Past Bookings (Completed)
(
    'BK-1782000001000', 
    'Mark Zuckerberg', 
    '+1 (650) 555-0199', 
    4, 
    '2026-06-25', 
    '13:00:00', 
    'Prefers deep fried Tilapia with Ugali. Needs close protection security clearance.', 
    'completed', 
    '2026-06-20 10:15:00+03', 
    '2026-06-25 14:15:00+03'
),
(
    'BK-1782000002000', 
    'Idris Elba', 
    '+44 7700 900077', 
    2, 
    '2026-06-28', 
    '20:30:00', 
    'Wants to meet the head chef to learn the traditional fish seasoning recipe.', 
    'completed', 
    '2026-06-27 15:45:00+03', 
    '2026-06-28 22:00:00+03'
),
(
    'BK-1782000003000', 
    'Amina Mohamed', 
    '+254 712 345678', 
    6, 
    '2026-07-01', 
    '12:30:00', 
    'Quiet corner table for a business lunch meeting with diplomats.', 
    'completed', 
    '2026-06-29 09:00:00+03', 
    '2026-07-01 14:00:00+03'
),
(
    'BK-1782000004000', 
    'John Kamau', 
    '+254 722 987654', 
    2, 
    '2026-07-02', 
    '19:00:00', 
    'Wedding anniversary celebration. Please provide a complimentary dessert if possible.', 
    'completed', 
    '2026-07-01 11:30:00+03', 
    '2026-07-02 21:00:00+03'
),

-- Today's Bookings (July 3, 2026)
(
    'BK-1782000005000', 
    'David Omondi', 
    '+254 733 111222', 
    5, 
    '2026-07-03', 
    '12:00:00', 
    'No raw onions in the Kachumbari salad, please.', 
    'completed', 
    '2026-07-02 18:20:00+03', 
    '2026-07-03 13:10:00+03'
),
(
    'BK-1782000006000', 
    'Sarah Wanjiku', 
    '+254 701 222333', 
    3, 
    '2026-07-03', 
    '13:30:00', 
    'Outdoor seating preferred near the terrace garden.', 
    'confirmed', 
    '2026-07-03 08:10:00+03', 
    '2026-07-03 08:15:00+03'
),
(
    'BK-1782000007000', 
    'Michael Kiprop', 
    '+254 755 444555', 
    8, 
    '2026-07-03', 
    '19:30:00', 
    'Celebrating a birthday. Need space to bring a cake. Near the live music band.', 
    'confirmed', 
    '2026-07-02 14:05:00+03', 
    '2026-07-02 15:30:00+03'
),
(
    'BK-1782000008000', 
    'Grace Mutua', 
    '+254 711 555666', 
    2, 
    '2026-07-03', 
    '20:00:00', 
    'Needs to be seated near the TV screen showing the AFCON football match.', 
    'pending', 
    '2026-07-03 09:30:00+03', 
    '2026-07-03 09:30:00+03'
),

-- Upcoming Future Bookings
(
    'BK-1782000009000', 
    'James Mwangi', 
    '+254 724 666777', 
    4, 
    '2026-07-04', 
    '13:00:00', 
    'Need extra space next to the table for a baby stroller.', 
    'confirmed', 
    '2026-07-02 11:00:00+03', 
    '2026-07-02 11:45:00+03'
),
(
    'BK-1782000010000', 
    'Fatuma Hassan', 
    '+254 790 777888', 
    6, 
    '2026-07-04', 
    '18:30:00', 
    'None', 
    'pending', 
    '2026-07-03 10:15:00+03', 
    '2026-07-03 10:15:00+03'
),
(
    'BK-1782000011000', 
    'Kenji Sato', 
    '+81 90 1234 5678', 
    2, 
    '2026-07-05', 
    '12:00:00', 
    'First time visiting Kenya and trying authentic Tilapia! Exciting!', 
    'confirmed', 
    '2026-07-01 16:30:00+03', 
    '2026-07-01 17:00:00+03'
),
(
    'BK-1782000012000', 
    'Lucy Otieno', 
    '+254 705 888999', 
    10, 
    '2026-07-05', 
    '14:00:00', 
    'Family get-together lunch. One guest uses a wheelchair, so accessibility is required.', 
    'pending', 
    '2026-07-03 07:00:00+03', 
    '2026-07-03 07:00:00+03'
),
(
    'BK-1782000013000', 
    'Peter Parker', 
    '+1 (212) 555-0143', 
    2, 
    '2026-07-06', 
    '19:00:00', 
    'Prefers a quiet table in the corner far from the speaker system.', 
    'pending', 
    '2026-07-02 09:12:00+03', 
    '2026-07-02 09:12:00+03'
),
(
    'BK-1782000014000', 
    'Sauti Sol Fan Club', 
    '+254 722 333444', 
    15, 
    '2026-07-10', 
    '20:00:00', 
    'Booking for the live Rumba night. Must be close to the performance stage.', 
    'confirmed', 
    '2026-07-02 15:00:00+03', 
    '2026-07-02 15:30:00+03'
),
(
    'BK-1782000015000', 
    'Dr. Jane Goodall', 
    '+44 20 7946 0958', 
    3, 
    '2026-07-15', 
    '13:00:00', 
    'Require vegetarian options (such as plain brown beans, Mokimo, or extra greens).', 
    'confirmed', 
    '2026-06-30 11:22:00+03', 
    '2026-06-30 12:00:00+03'
);
