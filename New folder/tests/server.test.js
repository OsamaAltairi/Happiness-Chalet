import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

async function reservePort() {
    const probe = createServer();
    await new Promise((resolve, reject) => {
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', resolve);
    });
    const { port } = probe.address();
    await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
    return port;
}

test('stores requests, enforces one booking per date, and supports admin decisions', async () => {
    const port = await reservePort();
    const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'chalet-booking-test-'));
    const serverPath = path.join(testDirectory, '..', 'server.js');
    const child = spawn(process.execPath, [serverPath], {
        cwd: path.dirname(serverPath),
        env: {
            ...process.env,
            PORT: String(port),
            ADMIN_PASSWORD: 'test-only-password-long-enough',
            DATABASE_DIRECTORY: dataDirectory,
            NODE_ENV: 'test'
        },
        stdio: 'ignore'
    });
    const baseUrl = `http://127.0.0.1:${port}`;
    let exitPromise;

    try {
        exitPromise = new Promise((resolve) => child.once('exit', resolve));
        let ready = false;
        for (let attempt = 0; attempt < 60; attempt += 1) {
            if (child.exitCode !== null) throw new Error(`Server exited with code ${child.exitCode}.`);
            try {
                const response = await fetch(`${baseUrl}/api/health`);
                if (response.ok) {
                    ready = true;
                    break;
                }
            } catch {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        assert.equal(ready, true, 'server should start and respond to health checks');

        const availabilityResponse = await fetch(`${baseUrl}/api/availability?offer=family`);
        const { dates, days } = await availabilityResponse.json();
        assert.ok(dates.length > 1, 'family package should have available dates');
        assert.equal(days.find((day) => day.date === dates[0]).status, 'available');
        assert.ok(days.some((day) => day.status === 'unavailable'), 'calendar should include unavailable offer days');

        async function createBooking(date) {
            return fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offer: 'family',
                    date,
                    adults: 5,
                    children: 2,
                    toddlers: 0,
                    name: 'عميل تجريبي',
                    phone: '+967783112244'
                })
            });
        }

        const firstResponse = await createBooking(dates[0]);
        assert.equal(firstResponse.status, 201);
        const { booking } = await firstResponse.json();
        assert.equal(booking.total, 25500);
        assert.equal(booking.status, 'pending');
        const bookedCalendar = await fetch(`${baseUrl}/api/availability?offer=family`).then((response) => response.json());
        assert.equal(bookedCalendar.days.find((day) => day.date === dates[0]).status, 'booked');
        assert.equal((await createBooking(dates[0])).status, 409);
        assert.equal((await fetch(`${baseUrl}/api/admin/bookings`)).status, 401);
        const signedOutSession = await fetch(`${baseUrl}/api/admin/session`).then((response) => response.json());
        assert.equal(signedOutSession.authenticated, false);

        const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'test-only-password-long-enough' })
        });
        assert.equal(loginResponse.status, 200);
        const cookie = loginResponse.headers.get('set-cookie').split(';')[0];
        const adminHeaders = { Cookie: cookie, 'Content-Type': 'application/json' };
        const signedInSession = await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: cookie } })
            .then((response) => response.json());
        assert.equal(signedInSession.authenticated, true);

        const confirmResponse = await fetch(`${baseUrl}/api/admin/bookings/${booking.id}`, {
            method: 'PATCH',
            headers: adminHeaders,
            body: JSON.stringify({ status: 'confirmed' })
        });
        assert.equal(confirmResponse.status, 200);
        assert.equal((await confirmResponse.json()).booking.status, 'confirmed');

        const secondBookingResponse = await createBooking(dates[1]);
        assert.equal(secondBookingResponse.status, 201);
        const { booking: secondBooking } = await secondBookingResponse.json();
        const rejectResponse = await fetch(`${baseUrl}/api/admin/bookings/${secondBooking.id}`, {
            method: 'PATCH',
            headers: adminHeaders,
            body: JSON.stringify({ status: 'rejected' })
        });
        assert.equal(rejectResponse.status, 200);
        const refreshedAvailability = await fetch(`${baseUrl}/api/availability?offer=family`).then((response) => response.json());
        assert.ok(refreshedAvailability.dates.includes(dates[1]), 'rejecting a request should release its date');
        assert.ok(!refreshedAvailability.dates.includes(dates[0]), 'a confirmed booking should retain its date');
    } finally {
        child.kill();
        if (exitPromise) await Promise.race([exitPromise, new Promise((resolve) => setTimeout(resolve, 2000))]);
        fs.rmSync(dataDirectory, { recursive: true, force: true });
    }
});
