// Awards Maker is a Streams Charts product, not a site of its own: the legal
// pages, the company and the contact are SC's (review 2026-09-24, items 8-9).
// Every link out to SC lives here, so the subdomain decision or a moved page is
// one edit.
//
// The legal paths are the ones SC serves, checked live 2026-10-06: /terms and
// /privacy answer 200, the /terms-of-use and /privacy-policy guessed earlier 404.
export const SC = {
  home: 'https://streamscharts.com',
  api: 'https://streamscharts.com/api',
  terms: 'https://streamscharts.com/terms',
  privacy: 'https://streamscharts.com/privacy',
  cookies: 'https://streamscharts.com/cookie-policy',
  contact: 'https://streamscharts.com/contact',
  // the SC hub for the big award shows - the other half of this subdomain's topic
  awardsHub: 'https://streamscharts.com/tools/awards',
} as const
