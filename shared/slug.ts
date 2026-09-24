// The one slugify. A show's URL is its name, and the audience is Ukrainian,
// Polish and Russian-speaking as much as English: the old ASCII-only version
// turned "Премія Стрімерів України 2026" into "2026" and "Społeczności Łódź"
// into "spo-eczno-ci-d".

/** Ukrainian, as the Cabinet of Ministers' 2010 table (the one in passports). */
const UK: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i',
  ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '', ʼ: '',
}
/** The same table's rule for the start of a word: Єва is Yeva, not Ieva. */
const UK_INITIAL: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' }

/** Russian, the common passport-style table. */
const RU: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Latin letters NFKD does not take apart. */
const LATIN: Record<string, string> = { ł: 'l', đ: 'd', ß: 'ss', æ: 'ae', ø: 'o', œ: 'oe', þ: 'th', ð: 'd', ı: 'i' }

// an apostrophe sits inside a word (об'єднання), so it does not start one
const isLetter = (ch: string | undefined) => !!ch && /[\p{L}'’ʼ]/u.test(ch)

export function transliterate(value: string): string {
  const text = value.toLowerCase()
  // и means y in Ukrainian and i in Russian; only Ukrainian has і, ї, є, ґ.
  // A name with none of them ("Гра року") could be either and reads as Russian.
  const ukrainian = /[іїєґ]/.test(text)
  const table = ukrainian ? UK : RU

  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ukrainian && UK_INITIAL[ch] && !isLetter(text[i - 1])) out += UK_INITIAL[ch]
    else if (ch in table) out += table[ch]
    else if (ch in LATIN) out += LATIN[ch]
    else out += ch
  }
  // ó, ą, ś, é, ü ... are a letter plus a combining mark once decomposed
  return out.normalize('NFKD').replace(/\p{M}/gu, '')
}

export function slugify(value: string): string {
  return transliterate(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}
