import { Heading } from '@/components/ui/Heading'

/**
 * Why the product exists, set as an essay rather than as marketing copy.
 *
 * It sits after the rows because it is the argument you read once you have seen what is on offer,
 * and it is the only place on the page where we say plainly whose side we are on.
 */
export function MissionNote() {
  return (
    <section id="mission" className="mx-auto w-full max-w-2xl scroll-mt-24 px-6 py-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Why Triperco</p>
        <Heading level={2} className="text-3xl text-deep">
          Skip straight to the good part
        </Heading>

        {/*
          Set in our own display serif rather than the generic serif stack, and in its real italic
          rather than a slant the browser fakes — which is what made this read as somebody else's
          page pasted in.
        */}
        <div className="flex flex-col gap-5 font-display text-[15px] italic leading-[1.85] text-muted">
          <p>
            We love travelling. We just don&apos;t love the four browser tabs, the twelve filters and
            the hour lost comparing rooms that all look the same.
          </p>

          <p>
            Triperco is an AI travel concierge: describe the trip in your own words and it plans and
            books the whole thing — flights, somewhere to stay, and what to do when you get there —
            in one conversation, priced and shaped around you rather than around whoever paid to be
            at the top.
          </p>

          <p>
            Because that is the part most travel sites get wrong. They earn their living from the
            hotels and airlines they list, so the ranking answers to somebody other than you. We take
            no commission for placing anything higher. Recommendations are ordered by how well they
            fit the trip you described, how good the place actually is, and whether it is honestly
            good value.
          </p>

          <p>
            Filters cannot find the things that matter. There is a difference between a gym and a
            good gym, between &ldquo;central&rdquo; and a room over a loud street. So we read what
            reviewers actually said and tell you the cons alongside the pros — the drawback is the
            most useful sentence on the page, and we would rather you heard it from us than found it
            at midnight on arrival.
          </p>

          <p>
            The same goes for getting there. Search engines miss airlines and routes, and sometimes
            the smart move is flying into a nearby airport, or moving your dates by two days. We
            check, and we say so.
          </p>

          {/* The takeaway, so it steps out of the essay: our own sans, upright, and darker. */}
          <p className="mt-2 font-sans text-base font-semibold not-italic leading-relaxed text-ink">
            Plan the whole trip in one conversation. Keep the parts you like, change the ones you
            don&apos;t, and book each one with the provider directly.
          </p>
        </div>
      </div>
    </section>
  )
}
