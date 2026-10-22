CREATE TABLE bookings_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer TEXT NOT NULL CHECK (offer IN (
        'standard', 'family', 'tent', 'glass',
        'event_20', 'event_30', 'event_40',
        'trip_weekend_20', 'trip_weekend_30', 'trip_weekend_40',
        'trip_weekday_5', 'trip_weekday_20', 'trip_weekday_30', 'trip_weekday_40',
        'picnic_tent', 'picnic_glass'
    )),
    booking_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    adults INTEGER NOT NULL CHECK (adults BETWEEN 0 AND 100),
    children INTEGER NOT NULL CHECK (children BETWEEN 0 AND 100),
    toddlers INTEGER NOT NULL CHECK (toddlers BETWEEN 0 AND 100),
    base_price INTEGER NOT NULL,
    extra_adults INTEGER NOT NULL,
    extra_children INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO bookings_new (
    id, offer, booking_date, customer_name, phone, adults, children, toddlers,
    base_price, extra_adults, extra_children, total_price, status, created_at, updated_at
)
SELECT
    id, offer, booking_date, customer_name, phone, adults, children, toddlers,
    base_price, extra_adults, extra_children, total_price, status, created_at, updated_at
FROM bookings;

DROP INDEX IF EXISTS one_active_booking_per_date;
DROP INDEX IF EXISTS bookings_created_at;
DROP TABLE bookings;
ALTER TABLE bookings_new RENAME TO bookings;

CREATE UNIQUE INDEX one_active_booking_per_date
    ON bookings (booking_date)
    WHERE status IN ('pending', 'confirmed');

CREATE INDEX bookings_created_at
    ON bookings (created_at DESC, id DESC);
