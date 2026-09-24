import { catalogStatus } from '../utils/catalog'

/** Read by every page's header and footer, so it is one COUNT and nothing else. */
export default defineEventHandler(() => catalogStatus())
