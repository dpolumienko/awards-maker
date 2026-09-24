import { createCheckout } from '../../utils/billing'
import { requireUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.role === 'admin') {
    throw createError({ statusCode: 409, statusMessage: 'Admins already have the paid tier' })
  }
  const site = useSiteConfig(event)
  return createCheckout(user.id, String(site.url).replace(/\/$/, ''))
})
