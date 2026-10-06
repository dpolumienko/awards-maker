// Demo build only: fills a show with sample ballots so the host dashboard has a
// curve and a standing to look at. Paste into the browser console on any page of
// the demo (localhost:3010 under `npm run dev:demo`, or the Pages demo), then
// reload the dashboard. Change SLUG and VOTERS below; run it again to add more.
;(() => {
  const SLUG = 'awards-2026'
  const VOTERS = 60
  const DAYS = 7

  const db = JSON.parse(localStorage.getItem('am-demo-db') || 'null')
  const show = db?.shows?.[SLUG]
  if (!show) return console.warn(`No demo show "${SLUG}" in this browser. Shows here:`, Object.keys(db?.shows ?? {}))

  // every category has a favourite, a runner-up and the rest, so the standing is
  // a race and not a coin toss; some voters skip a category, so reach differs
  const weights = (n) => Array.from({ length: n }, (_, i) => (i === 0 ? 5 : i === 1 ? 3 : 1))
  const pick = (items) => {
    const w = weights(items.length)
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < items.length; i++) if ((r -= w[i]) < 0) return items[i]
    return items[0]
  }
  // more ballots on the first day and on a "stream day" in the middle
  const dayWeights = Array.from({ length: DAYS }, (_, i) => (i === 0 ? 4 : i === Math.floor(DAYS / 2) ? 6 : 1 + Math.random() * 2))
  const dayFor = () => {
    let r = Math.random() * dayWeights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < DAYS; i++) if ((r -= dayWeights[i]) < 0) return i
    return DAYS - 1
  }

  const firstId = 20000 + show.ballots.length
  for (let v = 0; v < VOTERS; v++) {
    const picks = {}
    show.award.nominations.forEach((n, i) => {
      if (!n.nominees.length) return
      if (Math.random() < 0.08 + i * 0.07) return // later categories get skipped more
      picks[n.id] = pick(n.nominees).id
    })
    if (!Object.keys(picks).length) continue
    const at = new Date(Date.now() - (DAYS - 1 - dayFor()) * 86400000 - Math.random() * 6 * 3600000)
    show.ballots.push({ userId: firstId + v, picks, at: at.toISOString().replace(/\.\d{3}Z$/, 'Z') })
  }
  localStorage.setItem('am-demo-db', JSON.stringify(db))
  console.log(`Added ballots to "${SLUG}": ${show.ballots.length} in total. Reload the dashboard.`)
})()
