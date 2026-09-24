import { query, queryOne } from './db'

export interface CeremonySettings {
  stage: string
  font: string
  reveal: 'cut' | 'spotlight' | 'flip'
}

/** Null means the host has not been through the setup yet, which the screen shows. */
export function ceremonyFor(awardId: number) {
  return queryOne<CeremonySettings>(
    `SELECT stage, font, reveal FROM ceremony_settings WHERE award_id = ? LIMIT 1`,
    [awardId],
  )
}

export async function saveCeremony(awardId: number, settings: CeremonySettings) {
  await query(
    `INSERT INTO ceremony_settings (award_id, stage, font, reveal) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE stage = VALUES(stage), font = VALUES(font), reveal = VALUES(reveal)`,
    [awardId, settings.stage, settings.font, settings.reveal],
  )
}
