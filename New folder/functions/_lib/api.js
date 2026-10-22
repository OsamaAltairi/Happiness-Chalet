import {
    calculatePrice,
    getDateAvailability,
    getPackageName,
    getYemenDate,
    isIsoDate,
    packages
} from '../../booking-rules.js';

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 16 * 1024;
const COOKIE_NAME = 'chalet_session';

function json(status, payload, headers = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            ...headers
        }
    });
}

function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}

async function respond(env, handler) {
    try {
        ensureApiEnabled(env);
        return await handler();
    } catch (error) {
        if (!error.status) console.error('Pages Function request failed:', error);
        return json(error.status || 500, {
            error: error.status ? error.message : 'حدث خطأ داخلي. حاول مجددًا.'
        });
    }
}

function getDatabase(env) {
    if (!env.DB) fail(503, 'قاعدة البيانات غير مربوطة. أضف D1 binding باسم DB في إعدادات Cloudflare Pages.');
    return env.DB;
}

function ensureApiEnabled(env) {
    if (env.APP_ENABLED === 'false') {
        fail(503, 'الحجز غير مفعّل على بيئة المعاينة.');
    }
}

function requireSameOrigin(request) {
    const origin = request.headers.get('Origin');
    let matchesRequestOrigin = false;
    try {
        matchesRequestOrigin = Boolean(origin) && new URL(origin).origin === new URL(request.url).origin;
    } catch {
        matchesRequestOrigin = false;
    }
    if (!matchesRequestOrigin) {
        fail(403, 'الطلب غير مسموح من هذا المصدر.');
    }
}

async function readJson(request) {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
        fail(413, 'حجم الطلب أكبر من المسموح.');
    }
    try {
        return JSON.parse(text);
    } catch {
        fail(400, 'صيغة الطلب غير صالحة.');
    }
}

function getClientKey(request) {
    return request.headers.get('CF-Connecting-IP') || 'unknown';
}

async function rateLimit(db, request, action, limit, windowSeconds) {
    const identity = `${action}:${getClientKey(request)}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    const key = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - windowSeconds;
    const row = await db.prepare(`
        INSERT INTO rate_limits (bucket_key, window_started_at, request_count)
        VALUES (?, ?, 1)
        ON CONFLICT(bucket_key) DO UPDATE SET
            request_count = CASE WHEN window_started_at <= ? THEN 1 ELSE request_count + 1 END,
            window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END
        RETURNING request_count
    `).bind(key, now, cutoff, cutoff).first();
    if (row.request_count > limit) fail(429, 'تم تجاوز عدد المحاولات المسموح. حاول لاحقًا.');
}

function readCookie(request, name) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookie = cookieHeader.split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    return cookie ? cookie.slice(name.length + 1) : '';
}

async function hashToken(token) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function newToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function adminSession(request, env) {
    const token = readCookie(request, COOKIE_NAME);
    if (!token) return null;
    const db = getDatabase(env);
    const tokenHash = await hashToken(token);
    const now = Math.floor(Date.now() / 1000);
    const session = await db.prepare(`
        SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?
    `).bind(tokenHash, now).first();
    if (!session) return null;
    await db.prepare('UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?')
        .bind(now + SESSION_TTL_SECONDS, tokenHash).run();
    return tokenHash;
}

async function requireAdmin(request, env) {
    const tokenHash = await adminSession(request, env);
    if (!tokenHash) fail(401, 'يلزم تسجيل دخول الإدارة.');
    return tokenHash;
}

function toBooking(row) {
    return {
        id: row.id,
        offer: row.offer,
        packageName: getPackageName(row.offer),
        date: row.booking_date,
        name: row.customer_name,
        phone: row.phone,
        adults: row.adults,
        children: row.children,
        toddlers: row.toddlers,
        basePrice: row.base_price,
        extraAdults: row.extra_adults,
        extraChildren: row.extra_children,
        total: row.total_price,
        status: row.status,
        createdAt: row.created_at
    };
}

function validateBooking(payload, env) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        fail(400, 'بيانات الحجز غير صالحة.');
    }
    const { offer, date, adults, children, toddlers } = payload;
    if (!packages[offer]) fail(400, 'يرجى اختيار باقة صحيحة.');
    if (!isIsoDate(date)) fail(400, 'يرجى اختيار تاريخ صحيح.');
    if (date < getYemenDate()) fail(400, 'لا يمكن حجز تاريخ مضى.');

    const dateAvailability = getDateAvailability(offer, date);
    if (!dateAvailability.available) fail(400, dateAvailability.reason);

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
    const phoneDigits = phone.replace(/\D/g, '');
    if (name.length < 2 || name.length > 100) fail(400, 'يرجى إدخال اسم صحيح (من حرفين إلى 100 حرف).');
    if (phone.length > 20 || phoneDigits.length < 7 || phoneDigits.length > 15) {
        fail(400, 'يرجى إدخال رقم هاتف صحيح.');
    }

    let quote;
    try {
        quote = calculatePrice(offer, adults, children, toddlers);
    } catch (error) {
        fail(400, error.message);
    }
    return { offer, date, name, phone, adults, children, toddlers, quote };
}

async function getAvailability(db, offer) {
    if (!packages[offer]) return null;
    const occupiedRows = await db.prepare(`
        SELECT booking_date FROM bookings WHERE status IN ('pending', 'confirmed')
    `).all();
    const occupied = new Set((occupiedRows.results || []).map((row) => row.booking_date));
    const today = getYemenDate();
    const days = [];
    const start = new Date(`${today}T12:00:00.000Z`);
    for (let offset = 0; offset <= 365; offset += 1) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + offset);
        const isoDate = date.toISOString().slice(0, 10);
        const availability = getDateAvailability(offer, isoDate);
        const status = occupied.has(isoDate) ? 'booked' : availability.available ? 'available' : 'unavailable';
        days.push({
            date: isoDate,
            status,
            reason: status === 'unavailable' ? availability.reason : ''
        });
    }
    return days;
}

async function securePasswordMatches(input, expected) {
    const encoder = new TextEncoder();
    const [inputHash, expectedHash] = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(input)),
        crypto.subtle.digest('SHA-256', encoder.encode(expected))
    ]);
    const left = new Uint8Array(inputHash);
    const right = new Uint8Array(expectedHash);
    let mismatch = 0;
    for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
    return mismatch === 0;
}

export function availability(request, env) {
    return respond(env, async () => {
        const db = getDatabase(env);
        const days = await getAvailability(db, new URL(request.url).searchParams.get('offer'));
        if (!days) fail(400, 'الباقة غير معروفة.');
        return json(200, {
            days,
            dates: days.filter((day) => day.status === 'available').map((day) => day.date)
        });
    });
}

export function createBooking(request, env) {
    return respond(env, async () => {
        requireSameOrigin(request);
        const db = getDatabase(env);
        await rateLimit(db, request, 'booking', 8, 60 * 60);
        const booking = validateBooking(await readJson(request), env);
        try {
            const result = await db.prepare(`
                INSERT INTO bookings (
                    offer, booking_date, customer_name, phone, adults, children, toddlers,
                    base_price, extra_adults, extra_children, total_price, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `).bind(
                booking.offer, booking.date, booking.name, booking.phone,
                booking.adults, booking.children, booking.toddlers,
                booking.quote.basePrice, booking.quote.extraAdults,
                booking.quote.extraChildren, booking.quote.total
            ).run();
            return json(201, {
                booking: {
                    id: result.meta.last_row_id,
                    total: booking.quote.total,
                    status: 'pending'
                }
            });
        } catch (error) {
            if (/UNIQUE constraint failed.*booking_date/i.test(error.message)) {
                fail(409, 'عذرًا، تم حجز هذا الموعد للتو. اختر موعدًا آخر.');
            }
            throw error;
        }
    });
}

export function adminLogin(request, env) {
    return respond(env, async () => {
        requireSameOrigin(request);
        const db = getDatabase(env);
        await rateLimit(db, request, 'admin-login', 5, 15 * 60);
        const password = env.ADMIN_PASSWORD;
        if (!password || password.length < 12) throw new Error('ADMIN_PASSWORD secret is missing or too short.');
        const body = await readJson(request);
        if (!body || typeof body.password !== 'string' || !await securePasswordMatches(body.password, password)) {
            fail(401, 'كلمة المرور غير صحيحة.');
        }
        const token = newToken();
        const now = Math.floor(Date.now() / 1000);
        await db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now).run();
        await db.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)')
            .bind(await hashToken(token), now + SESSION_TTL_SECONDS).run();
        return json(200, { status: 'ok' }, {
            'Set-Cookie': `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
        });
    });
}

export function adminLogout(request, env) {
    return respond(env, async () => {
        requireSameOrigin(request);
        const db = getDatabase(env);
        const token = readCookie(request, COOKIE_NAME);
        if (token) {
            await db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
                .bind(await hashToken(token)).run();
        }
        return json(200, { status: 'ok' }, {
            'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
        });
    });
}

export function checkAdminSession(request, env) {
    return respond(env, async () => {
        return json(200, { authenticated: Boolean(await adminSession(request, env)) });
    });
}

export function listBookings(request, env) {
    return respond(env, async () => {
        const db = getDatabase(env);
        await requireAdmin(request, env);
        const result = await db.prepare('SELECT * FROM bookings ORDER BY created_at DESC, id DESC LIMIT 250').all();
        return json(200, { bookings: (result.results || []).map(toBooking) });
    });
}

export function updateBooking(request, env, id) {
    return respond(env, async () => {
        requireSameOrigin(request);
        const db = getDatabase(env);
        await requireAdmin(request, env);
        const body = await readJson(request);
        if (!body || !['confirmed', 'rejected'].includes(body.status)) fail(400, 'حالة غير صالحة.');
        const result = await db.prepare(`
            UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'
        `).bind(body.status, Number(id)).run();
        if (result.meta.changes !== 1) fail(409, 'الطلب غير موجود أو تمت معالجته مسبقًا.');
        const row = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(Number(id)).first();
        return json(200, { booking: toBooking(row) });
    });
}
