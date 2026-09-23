import { withBase } from 'ufo'

/**
 * Path to a file in `public/`, with the app's base URL in front of it.
 *
 * A bare `/img/icon.svg` is an absolute path: correct on the subdomain, a 404 on
 * any deploy that lives under a sub-path - the GitHub Pages demo serves the app
 * from `/awards-maker/`, and every illustration and category icon disappeared.
 * Nuxt rewrites asset URLs it resolves itself; a string in a template is ours.
 */
export const asset = (path: string) => withBase(path, useRuntimeConfig().app.baseURL)
