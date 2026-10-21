import { updateBooking } from '../../../_lib/api.js';

export function onRequestPatch({ request, env, params }) {
    return updateBooking(request, env, params.id);
}
