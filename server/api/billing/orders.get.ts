import { ordersFor, stripeConfigured } from '../../utils/billing'
import { requireUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return {
    orders: await ordersFor(user.id),
    // the billing page says why the button is dead rather than just disabling it
    payments: stripeConfigured(),
    comped: user.role === 'admin',
  }
})
