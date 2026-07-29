import { Inter, Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

/**
 * Brand font — the wordmark only, never body copy.
 *
 * Airbnb set their name in Cereal, which is not licensable. Plus Jakarta Sans is the closest thing
 * to it that we can actually ship: the same geometric skeleton, the same slightly soft terminals,
 * and it holds up set solid and lowercase at small sizes.
 */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

// Body / UI font — exposed as the --font-inter CSS variable (see globals.css @theme).
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

// Serif display font — exposed as the --font-fraunces CSS variable.
export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  // Real italics, so the mission essay is set rather than mechanically slanted.
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})
