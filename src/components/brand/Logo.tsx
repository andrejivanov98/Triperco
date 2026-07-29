import type { SVGProps } from 'react'

/**
 * The Triperco mark: a place, with a journey cut out of it.
 *
 * One solid shape — a map pin — and the only detail is the negative space inside it, which is a
 * plane climbing away. Nothing is layered and nothing is stroked, so there is no second colour, no
 * seam on a photograph, and nothing that thins out at small sizes: the counter simply gets smaller
 * along with the pin, the way the hole in an 'o' does.
 *
 * It says the two things the product is about at once — somewhere to go, and getting there.
 */
export function LogoMark({ className = 'h-8 w-8', ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2C10.2 2 5.5 6.7 5.5 12.5c0 7.9 10.5 17.5 10.5 17.5s10.5-9.6 10.5-17.5C26.5 6.7 21.8 2 16 2ZM22.2 7.4 9.8 13l4.8 6.4Z"
      />
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
  markClassName = 'h-8 w-8',
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
        <span className="font-brand text-[1.4rem] font-extrabold leading-none tracking-[-0.035em]">
          triperco
        </span>
      )}
    </span>
  )
}
