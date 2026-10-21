import { adminLogin } from '../../_lib/api.js';

export function onRequestPost({ request, env }) {
    return adminLogin(request, env);
}
