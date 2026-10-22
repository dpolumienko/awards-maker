import { query, queryOne } from './db'

export interface CeremonySettings {
  stage: string
  font: string
  reveal: string
  image?: string | null
  partners?: boolean
  counts?: boolean
}

/** Null means the host has not been through the setup yet, which the screen shows. */
export async function ceremonyFor(awardId: number): Promise<CeremonySettings | null> {
  const row = await queryOne<Omit<CeremonySettings, 'partners' | 'counts'> & { show_partners: number; show_counts: number }>(
    `SELECT stage, font, reveal, image, show_partners, show_counts FROM ceremony_settings WHERE award_id = ? LIMIT 1`,
    [awardId],
  )
  if (!row) return null
  const { show_partners, show_counts, ...rest } = row
  return { ...rest, partners: !!show_partners, counts: !!show_counts }
}

export async function saveCeremony(awardId: number, settings: CeremonySettings) {
  await query(
    `INSERT INTO ceremony_settings (award_id, stage, font, reveal, image, show_partners, show_counts) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE stage = VALUES(stage), font = VALUES(font), reveal = VALUES(reveal),
       image = VALUES(image), show_partners = VALUES(show_partners), show_counts = VALUES(show_counts)`,
    [awardId, settings.stage, settings.font, settings.reveal, settings.image ?? null, settings.partners === false ? 0 : 1, settings.counts === false ? 0 : 1],
  )
}
