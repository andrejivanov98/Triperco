# Four fixes: grounded results, a real brief, a phone that behaves, and journeys that route

2026-08-07

## The report

1. **The results are not at the destination.** Asked for somewhere to stay in Barcelona, the planner
   showed hotels in the United States. Not a wording problem — the traveler is being handed options
   for a trip they are not taking.
2. **The phone loses the chrome.** Open the conversation's history navigator, and the plan button and
   the header have scrolled away above it. Getting back to the plan means scrolling up and hoping.
3. **Nobody takes the brief.** The chat starts planning before it knows how many people are going or
   what sort of trip they want, and asks in prose when it asks at all.
4. **"Getting around" says there is no route.** For the hop that matters most — the airport to the
   stay — the plan reports nothing, and the traveler opens Google Maps, picks arrivals or departures
   and a terminal, and is shown four routes we said did not exist.

## 1. Grounded in the destination

The cause is not the prompt. `google_maps` and `google_hotels` are geo-biased, and a query with no
locality in it (`"best restaurants"`, `"hotels"`) resolves against the provider's own default — which
is the United States. A prompt cannot fix a search that was asked the wrong question, and it cannot
un-show a card that already rendered.

So this is enforced in code, in two layers, and the prompt only explains what the code already does.

**Layer one — ask the right question.** `anchorToDestination(q, destination)` appends the destination
to any query that does not already name it, and the geocoded destination is passed as `ll` to
`google_maps` when the model gives none. One provider call resolves `"Barcelona"` to a point, cached
for a day (`geocodePlace`), and it is the same lookup the plan hero photo already makes.

**Layer two — drop what came back from somewhere else.** `partitionNear` splits results by great-circle
distance from that point: 120 km for stays, 150 km for places. Anything outside is not rendered and
never reaches the model. When *every* result is outside, the tool returns an error naming the problem,
so the model searches again instead of describing an empty carousel.

A result with no coordinates is kept. The fence removes what is provably elsewhere; it does not
require proof of belonging.

**Flights** get the cheap, zero-false-positive checks only: departure and arrival must differ, and the
arrival must not be the recorded origin. The distance fence is deliberately *not* applied to a
`arrival_id`, because a destination named loosely — "Spain", "the Canaries" — geocodes to a centre
hundreds of kilometres from the airport a traveler would actually use, and blocking that search would
be a worse bug than the one being fixed. The stage goal already names the destination on the turn the
flights are searched.

## 2. A brief, taken with the controls we already have

The stage machine grows two steps, and both sit inside a gate:

```
destination → dates → party → interests → origin → transport → stay → activities → connections → complete
                      └────── only while nothing is in the plan yet ──────┘
```

`party` and `interests` are asked only while the plan is empty. A trip arriving from somebody else's
link with flights already in it is past its brief, and reopening it would stall a finished plan on a
question nobody needs answered.

Each intake stage carries an `asks` — the exact control it exists to put on screen, in the shape the
chat already renders (`data-detail` for a calendar or steppers, `data-form` for interests). The model
is told to ask, and has the tool for it. **And the route guarantees it.** `contractBreach` gains a
third verdict, `unasked`: an intake stage that rendered nothing at all. On that verdict the route
writes the stage's own card, with no second model call — the same shape as the existing `stalled`
path. A traveler can no longer be asked in prose for something a calendar answers.

`destination` becomes a fourth `DetailField`, so "where are you going?" is a card rather than a
sentence to compose.

Answers to our own cards are applied to the trip locally as well as sent to the model
(`metaFromAnswer`). The formats are ours — `"2027-03-19 to 2027-03-28"`, `"2 adults · 1 child · 1
room"`, the interest labels — so parsing them is reliable, and it means the intake cannot loop when
the model forgets to call `setTripMeta`.

Three details of that turned out to matter:

- **The answer is written to `tripRef` as well as to state.** The message goes out in the same tick and
  the request body reads the ref, so a trip updated only through `setTrip` would send the server a plan
  that had not heard the answer — and the server would compute the same step and ask straight back.
- **Any answer to the interests form closes it**, including one that matched none of the options.
  Returning nothing would leave the step where it was and the form would arrive again next turn. The
  model is still free to read real interests out of the prose and record them over the top.
- **An opening is not a destination.** The destination card offers shapes of trip — "Somewhere warm",
  "Surprise me" — and recording one as the destination would ground every later search in it. "Hotels
  in somewhere warm" is a question with no answer. `DESTINATION_OPENINGS` is named once, in `intake.ts`,
  and read by both the card and `metaFromAnswer`.

### The contract reads the settled step, not the one the turn started on

A turn can move the step itself, and judging the old one gets both halves wrong. A turn asked for the
destination that records it and stops would be handed the destination card back — a question about
something the trip already knows. And in the other direction: `getTransferOptions` renders no cards,
it answers in prose with real numbers, so measured against the step it started on **every** successful
"how do I get around" turn looked like a stall and collected an "I could not get the transfer times"
underneath the answer it had just given. That was a live bug before this work; recomputing
`planStage(state.trip)` after the turn fixes both, because the tool that does the work is the same tool
that moves the step on.

## 3. The phone

The header never scrolled — the document did. `body { min-height: 100vh }` under a shell sized
`100dvh` leaves the page taller than the visual viewport by exactly the height of the browser's URL
bar, so the document has somewhere to scroll to, and `scrollIntoView` inside the chat's own scroller
takes it there. That is the whole bug: tapping a section in the navigator scrolled the page, not just
the thread, and the plan button went with it.

- `html.app-shell, html.app-shell body { height: 100%; overflow: hidden; overscroll-behavior: none }`,
  set by the planner while it is mounted. The document has nowhere to go, so the chrome cannot leave.
- A `viewport` export with `viewportFit: 'cover'` and `interactiveWidget: 'resizes-content'`, so the
  shell resizes to the keyboard rather than being covered by it, and safe-area insets are readable.
- The composer and the plan drawer pad by `env(safe-area-inset-bottom)`.
- The chat scroller gets `overscroll-contain`, so reaching the top does not become a pull-to-refresh.
- On a phone the section navigator's list opens as a **bottom sheet** with a backdrop rather than an
  absolutely-positioned dropdown: it is thumb-reachable, it cannot be clipped by an ancestor, and it
  is the shape a native app uses for the same job.

## 4. Journeys that route

`findTransferOptions` already tries several ways of naming each end. It gains a last resort: geocode
each end and ask the directions engine for `lat,lng → lat,lng`. Coordinates always route, and they
sidestep the airport terminal picker entirely — which is the exact step the traveler was being made to
do by hand.

The resolved endpoints come back with the answer (`findTransferRoute`), and `/api/transfers` returns
them, so the card's Directions link opens the journey that actually routed rather than the name that
did not. When a leg still has no times, the card offers **Drive / Transit / Walk** links, each
deep-linked with `travelmode`, so the one manual step left is a single tap.

The `connections` stage goal is built from the plan: the airport the traveler lands at, the time they
land, and the time they fly home. That is what lets the concierge say something useful about an
unrouted hop — a tram that has stopped running at 01:20 is a real answer, and it is grounded in the
plan rather than invented.

The `getTransferOptions` tool moves onto the same resolution path, so the model's own lookups get the
alternates and the geocode fallback the plan panel has had. Its empty-answer note now says what to do
rather than only what not to say.

## What is deliberately not here

- No new provider engine, and no new model. Every fix above is either a parameter the provider already
  accepts or a filter over what it returned.
- The flight distance fence, for the reason given in §1.
- Country-level or language-aware matching of addresses. Distance is language-independent and needs no
  gazetteer.
