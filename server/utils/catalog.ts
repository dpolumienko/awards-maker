import { CATALOG } from '#shared/limits'
import { queryOne } from './db'

/** Whether the catalog is open yet, and how many shows it would hold. */
export async function catalogStatus(): Promise<{ open: boolean; count: number }> {
  const row = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM awards WHERE status = 'published'`)
  const count = Number(row?.n ?? 0)
  return { open: count >= CATALOG.minAwards, count }
}
