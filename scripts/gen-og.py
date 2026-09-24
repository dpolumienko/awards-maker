"""Renders the share cards in public/og/.

Why a script and not nuxt-og-image: the module ships with @nuxtjs/seo, but
nuxt-og-image 5.1.13 answers every image URL with 400 "Invalid island request
hash" on Nuxt 3.21 - in dev and in a production build alike (checked 2026-09-23).
An og:image that 404s to a crawler is worse than none, so the cards are rendered
once, committed, and served as plain files. That also covers the routes running
with `ssr: false`, where nothing Nuxt adds to the head reaches a crawler at all.

Per-awards cards (an image carrying the streamer's own name and colour) are
rendered at request time by server/routes/og/a/, with satori and resvg.

Run:  python scripts/gen-og.py          (needs playwright: pip install playwright)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / 'public' / 'og'
GOLD = '#D9A441'

CARDS = {
    'home': dict(
        kicker='Awards Maker',
        title='Run your own streamer awards',
        subtitle='Pick the categories, nominate any channel, let your chat vote.',
        facts=['Free with a Twitch login'],
    ),
    'ideas': dict(
        kicker='Awards Maker',
        title='End of year awards category ideas',
        subtitle='61 categories for a streamer awards show, grouped by what they are for.',
        facts=['For your chat', 'Streams and collabs', 'Funny categories'],
    ),
    'plans': dict(
        kicker='Awards Maker plans',
        title='Free, paid, or we run it for you',
        subtitle='Start free and pay only when a show outgrows the ceilings. No subscription.',
        facts=['5 categories free', '200 voters free'],
    ),
    'catalog': dict(
        kicker='Awards Maker',
        title='Community awards catalog',
        subtitle='Every awards show streamers are running here. Open one and vote while voting is open.',
        facts=[],
    ),
    'create': dict(
        kicker='Awards Maker',
        title='Create your own streamer awards',
        subtitle='Ready-made categories, any channel as a nominee, a page your chat votes on.',
        facts=['Free with a Twitch login'],
    ),
}

TEMPLATE = """<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  * {{ margin: 0; box-sizing: border-box; }}
  body {{ width: 1200px; height: 630px; font-family: Archivo, sans-serif; background: #000; color: #fff; }}
  .card {{ position: relative; width: 1200px; height: 630px; padding: 72px;
           display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }}
  .wash {{ position: absolute; inset: 0;
           background: radial-gradient(ellipse at 50% 132%, {accent} 0%, {accent}55 30%, rgba(0,0,0,0) 66%); }}
  .row {{ position: relative; display: flex; align-items: center; gap: 14px; }}
  .dot {{ width: 12px; height: 12px; border-radius: 999px; background: {accent}; }}
  .kicker {{ font-size: 22px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #A5A5AC; }}
  .mid {{ position: relative; display: flex; flex-direction: column; gap: 22px; }}
  h1 {{ font-size: 78px; font-weight: 800; line-height: 1.04; letter-spacing: -1.5px; text-transform: uppercase; }}
  .sub {{ font-size: 30px; line-height: 1.34; color: #A5A5AC; max-width: 24ch; }}
  .foot {{ position: relative; display: flex; align-items: center; justify-content: space-between; }}
  .facts {{ display: flex; gap: 16px; }}
  .fact {{ padding: 10px 20px; border-radius: 999px; border: 1px solid {accent}55; font-size: 22px; }}
  .url {{ font-size: 22px; color: #8A8A93; }}
</style></head><body>
<div class="card">
  <div class="wash"></div>
  <div class="row"><span class="dot"></span><span class="kicker">{kicker}</span></div>
  <div class="mid"><h1>{title}</h1>{sub}</div>
  <div class="foot"><div class="facts">{facts}</div><span class="url">awards.streamscharts.com</span></div>
</div></body></html>"""


def html(card):
    sub = f'<p class="sub">{card["subtitle"]}</p>' if card.get('subtitle') else ''
    facts = ''.join(f'<span class="fact">{f}</span>' for f in card.get('facts', []))
    return TEMPLATE.format(accent=GOLD, kicker=card['kicker'], title=card['title'], sub=sub, facts=facts)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        for name, card in CARDS.items():
            pg.set_content(html(card), wait_until='networkidle')
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(OUT / f'{name}.png'))
            print('wrote', OUT / f'{name}.png')
        br.close()


if __name__ == '__main__':
    main()
