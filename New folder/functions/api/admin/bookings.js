import { listBookings } from '../../_lib/api.js';

export function onRequestGet({ request, env }) {
    return listBookings(request, env);
}
