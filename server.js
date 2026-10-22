import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    calculatePrice,
    getDateAvailability,
    getPackageName,
    getYemenDate,
    isIsoDate,
    packages
} from './booking-rules.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;

if (ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_PASSWORD to a secret that is at least 12 characters long.');
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be a valid TCP port.');
}

const databaseDirectory = path.resolve(process.env.DATABASE_DIRECTORY || path.join(ROOT, 'data'));
fs.mkdirSync(databaseDirectory, { recursive: true });
const database = new DatabaseSync(path.join(databaseDirectory, 'bookings.sqlite'));
database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER NOT NULL,
        toddlers INTEGER NOT NULL,
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
    CREATE INDEX IF NOT EXISTS bookings_created_at ON bookings (created_at DESC);
`);

const sessions = new Map();
const rateLimits = new Map();

function sendJson(response, status, payload, headers = {}) {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...headers
    });
    response.end(JSON.stringify(payload));
}

function getClientAddress(request) {
    return request.socket.remoteAddress || 'unknown';
}

function isRateLimited(key, limit, windowMs) {
    const now = Date.now();
    const entry = rateLimits.get(key);
    if (!entry || entry.expiresAt <= now) {
        rateLimits.set(key, { count: 1, expiresAt: now + windowMs });
        return false;
    }
    entry.count += 1;
    return entry.count > limit;
}

async function readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw Object.assign(new Error('حجم الطلب أكبر من المسموح.'), { status: 413 });
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw Object.assign(new Error('صيغة الطلب غير صالحة.'), { status: 400 });
    }
}

function secureCompare(left, right) {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash) && left === right;
}

function getSession(request) {
    const cookie = request.headers.cookie || '';
    const sessionCookie = cookie.split(';').map((part) => part.trim())
        .find((part) => part.startsWith('chalet_session='));
    if (!sessionCookie) return null;
    const token = sessionCookie.slice('chalet_session='.length);
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        sessions.delete(token);
        return null;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return token;
}

function requireAdmin(request, response) {
    if (getSession(request)) return true;
    sendJson(response, 401, { error: 'يلزم تسجيل دخول الإدارة.' });
    return false;
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

function validateBooking(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw Object.assign(new Error('بيانات الحجز غير صالحة.'), { status: 400 });
    }
    const { offer, date, adults, children, toddlers } = payload;
    if (!packages[offer]) throw Object.assign(new Error('يرجى اختيار باقة صحيحة.'), { status: 400 });
    if (!isIsoDate(date)) throw Object.assign(new Error('يرجى اختيار تاريخ صحيح.'), { status: 400 });
    if (date < getYemenDate()) throw Object.assign(new Error('لا يمكن حجز تاريخ مضى.'), { status: 400 });

    const dateAvailability = getDateAvailability(offer, date);
    if (!dateAvailability.available) {
        throw Object.assign(new Error(dateAvailability.reason), { status: 400 });
    }

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
    const phoneDigits = phone.replace(/\D/g, '');
    if (name.length < 2 || name.length > 100) {
        throw Object.assign(new Error('يرجى إدخال اسم صحيح (من حرفين إلى 100 حرف).'), { status: 400 });
    }
    if (phone.length > 20 || phoneDigits.length < 7 || phoneDigits.length > 15) {
        throw Object.assign(new Error('يرجى إدخال رقم هاتف صحيح.'), { status: 400 });
    }

    let quote;
    try {
        quote = calculatePrice(offer, adults, children, toddlers);
    } catch (error) {
        throw Object.assign(error, { status: 400 });
    }
    return { offer, date, name, phone, adults, children, toddlers, quote };
}

function getAvailability(offer) {
    if (!packages[offer]) return null;
    const occupied = new Set(
        database.prepare("SELECT booking_date FROM bookings WHERE status IN ('pending', 'confirmed')").all()
            .map((row) => row.booking_date)
    );
    const today = getYemenDate();
    const days = [];
    const start = new Date(`${today}T12:00:00.000Z`);
    for (let offset = 0; offset <= 365; offset += 1) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + offset);
        const isoDate = date.toISOString().slice(0, 10);
        const dateAvailability = getDateAvailability(offer, isoDate);
        const status = occupied.has(isoDate) ? 'booked' : dateAvailability.available ? 'available' : 'unavailable';
        days.push({
            date: isoDate,
            status,
            reason: status === 'unavailable' ? dateAvailability.reason : ''
        });
    }
    return days;
}

function serveStatic(request, response, pathname) {
    const normalizedPath = pathname === '/' ? '/index.html' : pathname === '/admin' ? '/admin.html' : pathname;
    let filePath;
    try {
        filePath = path.resolve(ROOT, `.${decodeURIComponent(normalizedPath)}`);
    } catch {
        sendJson(response, 400, { error: 'مسار غير صالح.' });
        return;
    }
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || filePath === path.join(ROOT, 'server.js') ||
        filePath === path.join(ROOT, 'booking-rules.js') || filePath.startsWith(`${databaseDirectory}${path.sep}`)) {
        sendJson(response, 404, { error: 'الصفحة غير موجودة.' });
        return;
    }
    let file;
    try {
        file = fs.readFileSync(filePath);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            sendJson(response, 404, { error: 'الصفحة غير موجودة.' });
            return;
        }
        throw error;
    }
    const contentType = ({
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.webmanifest': 'application/manifest+json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.jfif': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.txt': 'text/plain; charset=utf-8'
    })[path.extname(filePath).toLowerCase()];
    if (!contentType) {
        sendJson(response, 404, { error: 'الملف غير متاح.' });
        return;
    }
    response.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(file);
}

async function handleRequest(request, response) {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const { pathname, searchParams } = url;

    if (pathname === '/api/health' && request.method === 'GET') {
        sendJson(response, 200, { status: 'ok' });
        return;
    }
    if (pathname === '/api/availability' && request.method === 'GET') {
        const days = getAvailability(searchParams.get('offer'));
        if (!days) {
            sendJson(response, 400, { error: 'الباقة غير معروفة.' });
            return;
        }
        sendJson(response, 200, {
            days,
            dates: days.filter((day) => day.status === 'available').map((day) => day.date)
        });
        return;
    }
    if (pathname === '/api/bookings' && request.method === 'POST') {
        if (isRateLimited(`booking:${getClientAddress(request)}`, 8, 60 * 60 * 1000)) {
            sendJson(response, 429, { error: 'تم تجاوز عدد الطلبات المسموح. حاول لاحقًا.' });
            return;
        }
        const booking = validateBooking(await readJson(request));
        try {
            const result = database.prepare(`
                INSERT INTO bookings (
                    offer, booking_date, customer_name, phone, adults, children, toddlers,
                    base_price, extra_adults, extra_children, total_price, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `).run(
                booking.offer, booking.date, booking.name, booking.phone,
                booking.adults, booking.children, booking.toddlers,
                booking.quote.basePrice, booking.quote.extraAdults,
                booking.quote.extraChildren, booking.quote.total
            );
            sendJson(response, 201, {
                booking: {
                    id: Number(result.lastInsertRowid),
                    total: booking.quote.total,
                    status: 'pending'
                }
            });
        } catch (error) {
            if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/i.test(error.message)) {
                sendJson(response, 409, { error: 'عذرًا، تم حجز هذا الموعد للتو. اختر موعدًا آخر.' });
                return;
            }
            throw error;
        }
        return;
    }
    if (pathname === '/api/admin/login' && request.method === 'POST') {
        if (isRateLimited(`login:${getClientAddress(request)}`, 5, 15 * 60 * 1000)) {
            sendJson(response, 429, { error: 'محاولات كثيرة. حاول بعد 15 دقيقة.' });
            return;
        }
        const body = await readJson(request);
        if (!body || typeof body.password !== 'string' || !secureCompare(body.password, ADMIN_PASSWORD)) {
            sendJson(response, 401, { error: 'كلمة المرور غير صحيحة.' });
            return;
        }
        const token = randomBytes(32).toString('base64url');
        sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        sendJson(response, 200, { status: 'ok' }, {
            'Set-Cookie': `chalet_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`
        });
        return;
    }
    if (pathname === '/api/admin/logout' && request.method === 'POST') {
        const token = getSession(request);
        if (token) sessions.delete(token);
        sendJson(response, 200, { status: 'ok' }, {
            'Set-Cookie': 'chalet_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
        });
        return;
    }
    if (pathname === '/api/admin/session' && request.method === 'GET') {
        sendJson(response, 200, { authenticated: Boolean(getSession(request)) });
        return;
    }
    if (pathname === '/api/admin/bookings' && request.method === 'GET') {
        if (!requireAdmin(request, response)) return;
        const rows = database.prepare('SELECT * FROM bookings ORDER BY created_at DESC, id DESC LIMIT 250').all();
        sendJson(response, 200, { bookings: rows.map(toBooking) });
        return;
    }
    const statusMatch = pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
    if (statusMatch && request.method === 'PATCH') {
        if (!requireAdmin(request, response)) return;
        const body = await readJson(request);
        if (!body || !['confirmed', 'rejected'].includes(body.status)) {
            sendJson(response, 400, { error: 'حالة غير صالحة.' });
            return;
        }
        const result = database.prepare(`
            UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'
        `).run(body.status, Number(statusMatch[1]));
        if (Number(result.changes) !== 1) {
            sendJson(response, 409, { error: 'الطلب غير موجود أو تمت معالجته مسبقًا.' });
            return;
        }
        const row = database.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(statusMatch[1]));
        sendJson(response, 200, { booking: toBooking(row) });
        return;
    }
    if (pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'المسار غير موجود.' });
        return;
    }
    serveStatic(request, response, pathname);
}

const server = createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    handleRequest(request, response).catch((error) => {
        if (!response.headersSent) {
            sendJson(response, error.status || 500, {
                error: error.status ? error.message : 'حدث خطأ داخلي. حاول مجددًا.'
            });
        } else {
            response.destroy(error);
        }
        if (!error.status) console.error('Request failed:', error);
    });
});

server.listen(PORT, () => {
    console.log(`Happiness Chalet booking server listening on port ${PORT}`);
});

function shutdown() {
    server.close(() => {
        database.close();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
