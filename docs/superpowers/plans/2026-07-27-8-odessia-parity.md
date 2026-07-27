# Plan 8 — Odessia parity pass

**Date:** 2026-07-27
**Branch:** `feat/8-odessia-parity`
**Source:** 14 numbered items from the user's screenshot review of odessia.com.

Worked in four batches, each verified (`npm test`, `npm run typecheck`) and committed on its own.

## Batch A — Landing (items L1–L3)

- **L1 Composer with guests + dates.** Pill input ("Ask Triperco anything") with two icon buttons:
  a people button opening a popover of **Rooms / Adults / Children** stepper rows, and a calendar
  button opening a real month picker with range selection. Both fold away; selections show as
  chips. Choices ride into `/plan` as query params.
- **L2 Illustrated category cards.** Hotels & homes / Flights / Things to do / Destinations, each a
  soft-cream tile with an inline SVG illustration in our palette, plus title and a two-line
  description. Inline SVG (no external assets) keeps them CSP-safe and instant.
- **L3 Full-bleed scrollable rows.** Featured destinations, Experiences you won't forget, Places we
  love — edge-to-edge, horizontally scrollable with ‹ › arrows and a subtitle under each heading,
  ≥10 items per row.

## Batch B — Chat presentation (items C1, C3, C4, C5, C8)

- **C1 Option menus** as a clean bordered list: one row per choice, hairline dividers, chevron at
  the right.
- **C3 Bigger stay cards.** Two-up grid inside the chat, large photo, save heart, gallery dots,
  title + total, rating · reviews · beds, per-night price, and a one-line description.
- **C4 Flight cards** as a proper itinerary row: airline mark, depart → arrive times, duration and
  stops on a route line, cabin, price.
- **C5 Full gallery.** Any photo opens a lightbox with next/prev, counter, keyboard arrows.
- **C8 Things-to-do cards + detail** with a photo mosaic, rating, review count, duration/price when
  the provider gives them, and Add to trip.

## Batch C — Plan pane (items C6, C7, C9)

- **C6 Interactive slots.** Dashed "Search flights" / "Add a return flight" / "Add a place to
  stay" / "Add things to do" rows that send the matching prompt into the chat.
- **C7 Destination cover.** Fetch a real photo of the destination city (Maps place → photos) and
  use it as the plan hero.
- **C9 Remove.** Expandable timeline cards with Remove and View details.

## Batch D — Booking + summary (items C2, C10, C11)

- **C2 Context in the prompt.** Rooms/adults/children/dates from the landing composer are recorded
  on the trip and stated in the opening message, so the agent searches with them.
- **C10 Continue to book.** A partners screen: one card per bookable item with its price, dates and
  a Book on <provider> button, plus a booking-status control (Not booked / Booked / Confirmed).
- **C11 Trip summary.** A printable summary of the whole trip with partner bookings and statuses.

## Honest constraint

The screenshots show GetYourGuide tour data (duration, participants, "From $103"). We have no
tours provider — activities come from Google Maps places. The activity card and detail are built to
render duration/price/participants **when present**, so adding a tours source later fills them in
without further UI work. Everything else uses data we actually have.
