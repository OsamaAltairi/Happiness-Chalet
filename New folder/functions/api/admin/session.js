import { checkAdminSession } from '../../_lib/api.js';

export function onRequestGet({ request, env }) {
    return checkAdminSession(request, env);
}
