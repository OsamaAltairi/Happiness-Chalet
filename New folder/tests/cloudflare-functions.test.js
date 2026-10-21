import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    adminLogin,
    adminLogout,
    availability,
    checkAdminSession,
    createBooking,
    listBookings,
    updateBooking
} from '../functions/_lib/api.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createD1TestBinding() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(fs.readFileSync(path.join(projectRoot, 'migrations', '0001_initial_schema.sql'), 'utf8'));

    return {
        prepare(query) {
            let parameters = [];
            const prepared = {
                bind(...values) {
                    parameters = values;
                    return prepared;
                },
                async first() {
                    return sqlite.prepare(query).get(...parameters) || null;
                },
                async all() {
                    return { results: sqlite.prepare(query).all(...parameters) };
                },
                async run() {
                    const result = sqlite.prepare(query).run(...parameters);
                    return {
                        success: true,
                        meta: {
                            changes: Number(result.changes),
                            last_row_id: Number(result.lastInsertRowid || 0)
                        }
                    };
                }
            };
            return prepared;
        },
        close() {
            sqlite.close();
        }
    };
}

function request(pathname, { method = 'GET', body, cookie } = {}) {
    const headers = {
        'CF-Connecting-IP': '203.0.113.10',
        ...(['POST', 'PATCH'].includes(method) ? { Origin: 'https://chalet.example' } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {})
    };
    return new Request(`https://chalet.example${pathname}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {})
    });
}

test('Cloudflare Pages API stores bookings in D1 and authenticates admin actions', async () => {
    const DB = createD1TestBinding();
    const env = { DB, ADMIN_PASSWORD: 'test-admin-password-strong' };
    try {
        const availabilityResponse = await availability(request('/api/availability?offer=family'), env);
        assert.equal(availabilityResponse.status, 200);
        const available = await availabilityResponse.json();
        assert.ok(available.days.some((day) => day.status === 'unavailable'));
        const date = available.dates[0];

        const bookingResponse = await createBooking(request('/api/bookings', {
            method: 'POST',
            body: {
                offer: 'family',
                date,
                adults: 5,
                children: 2,
                toddlers: 0,
                name: 'عميل تجريبي',
                phone: '+967783112244'
            }
        }), env);
        assert.equal(bookingResponse.status, 201);
        const { booking } = await bookingResponse.json();
        assert.equal(booking.total, 25500);

        const duplicateResponse = await createBooking(request('/api/bookings', {
            method: 'POST',
            body: {
                offer: 'family',
                date,
                adults: 5,
                children: 0,
                toddlers: 0,
                name: 'عميل آخر',
                phone: '+967733700974'
            }
        }), env);
        assert.equal(duplicateResponse.status, 409);

        const loginResponse = await adminLogin(request('/api/admin/login', {
            method: 'POST',
            body: { password: env.ADMIN_PASSWORD }
        }), env);
        assert.equal(loginResponse.status, 200);
        const cookie = loginResponse.headers.get('Set-Cookie').split(';')[0];
        assert.match(loginResponse.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);

        const sessionResponse = await checkAdminSession(request('/api/admin/session', { cookie }), env);
        assert.deepEqual(await sessionResponse.json(), { authenticated: true });

        const bookingsResponse = await listBookings(request('/api/admin/bookings', { cookie }), env);
        assert.equal((await bookingsResponse.json()).bookings.length, 1);

        const confirmResponse = await updateBooking(request(`/api/admin/bookings/${booking.id}`, {
            method: 'PATCH',
            cookie,
            body: { status: 'confirmed' }
        }), env, booking.id);
        assert.equal(confirmResponse.status, 200);
        assert.equal((await confirmResponse.json()).booking.status, 'confirmed');

        const logoutResponse = await adminLogout(request('/api/admin/logout', { method: 'POST', cookie }), env);
        assert.equal(logoutResponse.status, 200);
        const loggedOutSession = await checkAdminSession(request('/api/admin/session', { cookie }), env);
        assert.deepEqual(await loggedOutSession.json(), { authenticated: false });
    } finally {
        DB.close();
    }
});

test('Cloudflare Pages API rejects cross-origin booking posts', async () => {
    const DB = createD1TestBinding();
    try {
        const response = await createBooking(new Request('https://chalet.example/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
            body: '{}'
        }), { DB, ADMIN_PASSWORD: 'test-admin-password-strong' });
        assert.equal(response.status, 403);
    } finally {
        DB.close();
    }
});

test('preview environment disables the production database API', async () => {
    const response = await availability(request('/api/availability?offer=family'), {
        APP_ENABLED: 'false'
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /المعاينة/);
});
