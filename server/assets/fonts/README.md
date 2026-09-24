# Fonts for the server-drawn share cards

Used by `server/utils/og-card.ts` (satori needs the font bytes; it cannot use a
CSS `@font-face`). WOFF, not WOFF2 - satori does not read WOFF2.

Taken from the `@fontsource/*` packages, one file per subset and weight:
Archivo, Anton, Playfair Display, Space Grotesk (latin, latin-ext) and
Noto Sans (cyrillic, cyrillic-ext) as the fallback for Cyrillic names.

All are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).
