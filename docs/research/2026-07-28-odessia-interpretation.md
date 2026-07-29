# Odessia — an interpretation of the experience

Companion to `2026-07-28-odessia-teardown.md`. That document records what the site *is*.
This one argues what it's *for*. Facts are cited from the teardown; everything labelled
**[inference]** is my reading and could be wrong.

---

## The thesis

Odessia is not a chatbot with a booking engine bolted on. It is **an opinionated travel
magazine whose articles happen to be executable**, and the chat is its query language.

Two systems sit side by side:

- a **taste engine** — destination guides, the Odessia Report, curated hotel and activity
  sets, the cons-and-watch-outs, the founder's manifesto
- a **transaction engine** — accommodation and flight search sessions, rate normalization,
  supplier mappings, checkout, 3DS, prebooking

The chat is the seam between them. **[inference]** This is why the admin surface is ~40
routes of unglamorous data work — rate normalization, bed-type patterns, ADA patterns,
amenity mapping, supplier mappings, georef grounding, destination-media curation. Opinions
are only defensible if the supply underneath them is normalized. The editorial voice is the
product; the plumbing is what makes the voice safe to trust.

---

## The experience, step by step

### 0. The landing page is a taste demonstration, not a funnel

45 destinations with one-line character sketches. 33 real tours with real descriptions. 31
hotels, each with a sketch. A long founder letter. None of it is placeholder.

**[inference]** The job of this page is not to convert — it is to establish that somebody
here has *opinions*. "High desert air, adobe walls, and sharp green chile" is not SEO filler;
it is a claim to editorial authority. Every row terminates in a CTA that leads back into the
chat ("Ask Odessia where to go", "Search activities", "Plan yours"). So the structure is
**many doors into one room**: the page's variety exists to give every kind of visitor a reason
to start a conversation, whatever they arrived wanting.

### 1. The composer is a structured prompt builder disguised as a search form

The composer carries free text *and* Flights / Stays / Activities tabs, with pickers for
rooms, guests, cabin, stops, dates.

**[inference]** This is a deliberate hedge against the central UX problem of agentic products:
users don't know what to say. Rather than teach them, Odessia hands them the OTA form they
already know — but the form's output is **not a results page**. It is
`homepageComposerIntent`, an object handed to the agent as `home_composer_intent`. The form
builds a sentence, not a query.

Two details reveal care:

- **Defaults are stripped.** 1 adult / 0 children / ≤1 room encode as *nothing*. The agent
  isn't told "0 pets, 0 infants" — it's told nothing, and stays free to ask.
- **The whole object is dropped if every field is empty**, so an empty form never pollutes
  the context with a shell of nulls.

**[inference]** They are protecting the agent from over-specification. A form that fills in
defaults would make the agent behave as if the user had made choices they never made.

### 2. The chat is a workspace, not a transcript

The strongest evidence is `search_updated` and `flight_search_update` — result sets are
**mutable objects living in the thread**, not immutable messages. Add `ui_search_form_summary`
with its CTAs ("Search flights with these preferences"), and the search parameters become a
persistent, editable object rather than a past utterance.

**[inference]** This is the single biggest structural difference from how we built Triperco.
Our chat accumulates: every refinement produces a new carousel, and the old ones stay as
sediment. Theirs *revises*. "Cheaper?" edits the existing set. The conversation is closer to
a document you and the agent co-edit than to a messaging thread.

### 3. Context hints make deixis work

Before every message, the client snapshots what's on screen into the model context:
`activity_search_results`, `activity_panel_context`, `hotel_room_options_context`, the flights
equivalent — each with a plain-English description like *"Room and rate options visible in the
hotel UI when the user sent this message."*

**[inference]** This dissolves the failure that makes most travel agents feel stupid. A user
says "the second one", "is that one quieter?", "what about the cheaper room" — words that only
mean something relative to the screen. Without the viewport, the agent has to guess or ask,
and asking is what makes it feel like a form. Odessia's agent can just answer.

The implementation discipline says they were burned learning this:

- the **active item is hoisted to the front** if it falls outside the cap, never dropped —
  because the one thing the user is definitely talking about is the thing they've selected
- prices carry `captured_at` and are described to the model as *"a UI snapshot"* — so the
  agent never states a stale price as fact
- every field is zod-parsed with `.catch(undefined)` — a malformed field degrades the hint
  instead of losing it

**[inference]** That third point is the tell. You only write per-field fallbacks after a
supplier payload changed shape in production and took the whole hint down with it.

### 4. Prose is a surface, not a wrapper

They keep markdown and make its nouns live: `odessia-rich-mention-image` turns a place named
in a sentence into a mention carrying an image that expands into a card with actions;
`markdown-external-url-chip` turns a bare URL into a domain chip.

**[inference]** Their bet is that **the agent's prose is the primary navigation**. A paragraph
about Oaxaca is a menu. This is more ambitious than what we built and riskier in a specific
way: a place the model names but that doesn't resolve becomes a dead chip, and the failure is
visible mid-sentence. Our approach — strip markdown, put all data in components — cannot fail
that way, at the cost of a flatter experience. Both are coherent. Theirs needs better entity
grounding to survive, which is presumably part of what `georef-grounding` is for.

### 5. "Things to do" is three different products

`ui_activity_search`, `ui_experience_search`, `ui_events_search` are separate components, and
`slotSelection` handles vacancies, ticket categories (adult/child/youth/group), `per_group`
pricing and `maxGroupSize`.

**[inference]** They refuse to flatten three commerce models into one card. A bookable tour
has ticket tiers and departure slots. An experience is a recommendation. An event is anchored
to a date you can miss. Collapsing them — which is what we do — loses the thing that makes
each one actionable. This also explains why they can leave days flexible: activities aren't
placed on days, they're held as slots with real availability.

### 6. Trip shape is a question, not an assumption

`ui_destinations_1_stop` vs `ui_destinations_multi_stop`, and `multicity` with `legs[]` in the
flight intent.

**[inference]** "Where should I go" may legitimately answer with a route rather than a place.
The founder letter says so directly — stitching together trips, flying into a nearby airport
and driving. Single-destination is a special case in their model, not the default.

### 7. The plan is a completion meter you summon

It lives in the URL (`?trips=open&trip=…&screen=list|detail|partner-bookings`), as an overlay
rather than a permanent pane, and `tripWorkflow` tracks `destination → transport → stay` with
added/target counts per step.

**[inference]** The plan's job is **to tell you what's missing**, and thereby send you back to
the chat. It is a nag with good manners. That it's summonable rather than always-present says
the conversation is the main event and the plan is a checkpoint — the opposite emphasis from
our fixed 70/30 split, which asserts the plan is a constant companion.

Neither is wrong, but they're different claims. Ours costs 30% of the viewport permanently and
pays for it in reassurance: you can always see what you've built. Theirs buys a wider
conversation and pays for it in having to remember to check.

### 8. They assume reality will diverge from the plan

"Bookings on file that aren't in your plan." "Booked directly with the operator. Tap to reopen
the link any time." "Dismiss if you've moved on from this booking." "Dates TBD." Plus a Gmail
connection and a `travel-memory` route.

**[inference]** This is the most mature thing in the product. Most planners pretend to be the
source of truth, so the moment you book something elsewhere the plan becomes a lie and you
stop trusting it. Odessia treats itself as **a view over a messy reality it does not control**,
and builds affordances for the drift: reconcile, dismiss, import. The booking lifecycle
(`draft → pending → pending confirmation → confirmed`, with `failed`, `attention`,
`marked-cancelled`) is the same instinct — bookings are slow, asynchronous and fallible, and
the UI says so instead of hiding it.

### 9. Trust is the feature, and the cons section is how they buy it

The Odessia Report leads with pros but always ships **Cons and watch-outs** — "Early Morning
Birds", "Internal Sound Echoes", "Limited Natural Light" — each grounded in verbatim guest
quotes with scores, over eight sub-scores and *"Based on 1,484 verified reviews &
publications"*.

**[inference]** Telling you what's wrong with a hotel is the cheapest credible proof that you
aren't being sold that hotel. It's the same move as the founder letter's *"no amount of money
will bias it"* and *"never paid for"*. An aggregator that criticises its inventory is claiming
its incentives point at the traveller.

Worth noting the tension honestly: they *do* run partner bookings (Airbnb, GetYourGuide,
Kayak), take payment in-app, and issue credits and gift cards. So the claim is narrower than
it reads — *we are not paid to rank differently*, not *we don't make money from this*. That is
a defensible position, but it is a position, not an absence of one.

---

## Their biggest bet, and where it could break

**[inference]** The bet is that **taste is the moat, not the agent.** Anyone can wire an LLM
to a flight API; almost nobody will write and maintain opinionated guides for hundreds of
destinations and a cons section for every hotel on earth. The agent is a delivery mechanism
for editorial judgement.

The risk sits in the same place. The uniformity across guides — identical section taxonomy,
the same named callout types (Insider Move / Common Mistake / Skip This / Timing Matters), ~45
FAQs per hotel — reads as **generated at scale**. So "we read every review and writeup for
every hotel in the world" describes a pipeline, not a critic. That works until it's confidently
wrong about something that costs a traveller money or a day, at which point the trust
proposition inverts hard: an opinionated source that's wrong is worse than a neutral one.

Their hedge is visible and smart: nearly every editorial claim is **grounded in a citable
artefact** — a verbatim guest quote with a score, a review count, a named restaurant that
resolves to a real place. The voice is confident; the evidence is attached. That is the same
discipline as `captured_at` on prices, applied to prose.

---

## What this means for Triperco

1. **The gap isn't features, it's awareness.** Context hints are the difference between an
   agent that searches and an agent that is in the room with you. Everything else on the gap
   list is smaller than this.
2. **Revise result sets instead of appending them.** Our chat accumulates sediment; theirs
   edits in place. This is architectural and gets harder to retrofit the longer we wait.
3. **Our editorial layer is empty.** We rank and badge; they characterise and criticise. We
   already pull review text — we synthesise nothing from it. Cons-and-watch-outs is the
   highest-value thing we could add that isn't plumbing.
4. **Our structural choices are defensible, not deficient.** The fixed 70/30 split and the
   markdown-free chat are different bets from theirs, and both follow from decisions already
   made deliberately (the plan belongs to the traveller; chat carries conversation only).
   Worth keeping unless we change our mind about the premise, not because they differ.
5. **The three-way split of "things to do"** is the cheapest borrowed idea with real payoff —
   it's what makes flexible days work without feeling unplanned.
