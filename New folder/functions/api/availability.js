import { availability } from '../_lib/api.js';

export function onRequestGet({ request, env }) {
    return availability(request, env);
}
