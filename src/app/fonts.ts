import { Inter, Fraunces } from 'next/font/google'

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
  variable: '--font-fraunces',
  display: 'swap',
})
