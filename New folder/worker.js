import {
    adminLogin,
    adminLogout,
    availability,
    checkAdminSession,
    createBooking,
    listBookings,
    updateBooking
} from './functions/_lib/api.js';

function json(status, payload) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const { pathname } = url;

        if (pathname === '/api/health' && request.method === 'GET') {
            return json(200, { status: 'ok' });
        }
        if (pathname === '/api/availability' && request.method === 'GET') {
            return availability(request, env);
        }
        if (pathname === '/api/bookings' && request.method === 'POST') {
            return createBooking(request, env);
        }
        if (pathname === '/api/admin/login' && request.method === 'POST') {
            return adminLogin(request, env);
        }
        if (pathname === '/api/admin/logout' && request.method === 'POST') {
            return adminLogout(request, env);
        }
        if (pathname === '/api/admin/session' && request.method === 'GET') {
            return checkAdminSession(request, env);
        }
        if (pathname === '/api/admin/bookings' && request.method === 'GET') {
            return listBookings(request, env);
        }

        const bookingMatch = pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
        if (bookingMatch && request.method === 'PATCH') {
            return updateBooking(request, env, bookingMatch[1]);
        }
        if (pathname.startsWith('/api/')) {
            return json(404, { error: 'المسار غير موجود.' });
        }
        if (!env.ASSETS) {
            return json(500, { error: 'أصول الموقع غير مربوطة في إعدادات Worker.' });
        }
        return env.ASSETS.fetch(request);
    }
};
