import type { SVGProps } from 'react'

/**
 * The Triperco mark: a place, with a journey cut out of it.
 *
 * One solid shape — a map pin — whose only detail is the negative space inside it: a paper plane
 * climbing away, with its fold cut back in as a third subpath so the two wings read separately.
 *
 * Nothing is layered and nothing is stroked, so there is no second colour, no seam on a photograph,
 * and nothing that thins out at small sizes: the counter simply gets smaller along with the pin, the
 * way the hole in an 'o' does. Below roughly 24px the fold line drops out and the plane falls back
 * to a clean dart — which is the right thing to lose first.
 *
 * It says the two things the product is about at once — somewhere to go, and getting there.
 *
 * The fold stops short of the nose. Run all the way up it met the dart's tip and cut a notch out of
 * it, so the plane read as blunt-nosed at every size — the one part of the shape that has to stay
 * sharp. Both ends of the sliver are pulled back along its own axis, so its width is unchanged.
 */
export const LOGO_PATH =
  'M16 2C10.2 2 5.5 6.7 5.5 12.5c0 7.9 10.5 17.5 10.5 17.5s10.5-9.6 10.5-17.5C26.5 6.7 21.8 2 16 2ZM23.6 9.3 8.1 14l6 1.9.6 5.7ZM21 10.4 14.2 15.1l.6.9 6.8-4.7Z'

export function LogoMark({ className = 'h-9 w-9', ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path fillRule="evenodd" clipRule="evenodd" d={LOGO_PATH} />
    </svg>
  )
}

/**
 * The lockup: the mark, then the name.
 *
 * Set solid and lowercase — a name in lowercase reads as a thing people say rather than a company
 * announcing itself, which is the register the rest of the product is written in.
 */
export function Logo({
  className = '',
  markClassName = 'h-9 w-9',
  showWordmark = true,
}: {
  className?: string
  markClassName?: string
  /** False renders the mark alone, for favicons and tight corners. */
  showWordmark?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-deep ${className}`}>
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span className="font-brand text-[1.6rem] font-extrabold leading-none tracking-[-0.035em]">
          triperco
        </span>
      )}
    </span>
  )
}
