CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer TEXT NOT NULL CHECK (offer IN ('standard', 'family', 'tent', 'glass')),
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

CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_date
    ON bookings (booking_date)
    WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS bookings_created_at
    ON bookings (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at
    ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
    bucket_key TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL
);
