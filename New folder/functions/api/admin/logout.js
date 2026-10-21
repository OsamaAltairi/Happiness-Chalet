import { adminLogout } from '../../_lib/api.js';

export function onRequestPost({ request, env }) {
    return adminLogout(request, env);
}
