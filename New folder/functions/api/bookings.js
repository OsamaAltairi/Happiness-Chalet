import { createBooking } from '../_lib/api.js';

export function onRequestPost({ request, env }) {
    return createBooking(request, env);
}
