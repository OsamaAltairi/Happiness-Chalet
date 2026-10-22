DROP INDEX IF EXISTS one_active_booking_per_date;

CREATE UNIQUE INDEX one_active_booking_per_date
    ON bookings (booking_date)
    WHERE status = 'confirmed';
