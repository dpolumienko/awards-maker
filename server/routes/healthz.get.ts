/**
 * Deliberately touches no data source. The container healthcheck reads this, and
 * a MySQL outage must not get the app killed and restart-looped on top of it.
 */
export default defineEventHandler(() => ({ status: 'ok', uptime: Math.round(process.uptime()) }))
