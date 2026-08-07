# Planner conversation: the app decides the step, the model executes it

2026-08-07

## The report

Two behaviours, from a real session.

**One.** Opening message: `Skopje - Tenerife. Travelling from 2027-03-19 to 2027-03-28 for 2 adults.`
The reply: *"Alright, I'll look into flights from Skopje to Tenerife for those dates for two adults."*
No flights appeared. Underneath it, chips reading **"Somewhere warm and cheap"** and **"Surprise me
with an idea"** — the app offering to reconsider a destination the traveler had just named.

**Two.** After choosing flights, nothing happened. The concierge should have carried on: a bed next,
then things to do.

## What was actually wrong

Four defects, three of them independent of the model.

1. **The chips were never the model's.** `suggestQuickReplies` returned a fixed inspirational list
   whenever `trip.meta.destination` was empty. Typing "Skopje - Tenerife" as free text put it in the
   composer's `q`, not `dest`, so `contextToMeta` set no destination — and the agent had not called
   `setTripMeta` either. `ChatPane` only replaces the fallback when the agent calls `suggestReplies`.
2. **Nothing caught a turn that talked and did nothing.** `isUnusableTurn` fired only when text *and*
   rendered output were both empty. Narration with zero tool calls passed as a healthy turn.
3. **Adding to the plan never reached the model.** `addResult` mutated local state; the plan hint is
   built at *send* time. So "flights are in — shall we find a bed?" was architecturally impossible,
   however the prompt was worded.
4. **The prompt gave contradictory verdicts on that exact input.** 174 lines, 14 shouted sections.
   *MOVE FAST* said search now; *DID THEY SAY WHAT THEY WANT* said trip-without-task → menu;
   *ASK BEFORE ASSUMING THE SHAPE OF THE FLIGHT* said ask round-trip vs one-way; *GUIDED CHOICES*
   said ask for the origin. No stated precedence. The model resolved it by narrating and stopping.

## The design

### Stage machine — `src/lib/trip/stage.ts`

`planStage(trip)` is a pure function returning the step the plan is on, plus everything that follows
from it: the turn's goal, which question-tools are legal, the fallback chips, and the copy to use if
the turn delivers nothing.

```
destination → dates → origin → transport → stay → activities → connections → complete
```

Settled means *in the plan or explicitly skipped*. `TripMeta.skipped` carries "we're driving",
"staying with family", "we'll wing the days" — a skipped part is as settled as a booked one.
Transport reuses `tripProgress`, so the stage and the plan panel's checklist can never disagree
about whether someone still needs a flight home. `TripMeta.transfersReviewed` is set by
`getTransferOptions` itself when it runs, so reaching the end never depends on the model recording
that it did something.

### Withhold only the tools that stall

The gate is narrower than blanket `activeTools` filtering, which would cage the model on off-stage
requests. Every search, lookup and `setTripMeta` stays available at every stage. Only the three
tools that end a turn with nothing on screen are gated:

| Stage | `presentOptions` | `askTripDetail` | `askPreferences` |
|---|---|---|---|
| destination | ✅ | ✅ | ✅ |
| dates, origin | ❌ | ✅ | ❌ |
| transport, stay, activities, connections | ❌ | ❌ | ❌ |
| complete | ✅ | ✅ | ✅ |

The reported trip lands on `transport` — destination, dates, party and origin all known. The model
has no legal way to ask and no way to show a menu. Offering alternatives instead of the search is
not a move it can make. A traveler who asks about restaurants mid-flight-search still gets
restaurants, because `searchPlaces` was never withheld.

### Turn contract — `contractBreach(turn, stage)`

Two failure modes. `empty` keeps the existing repair path. `stalled` is new: a delivery stage that
rendered nothing, judged **structurally** rather than by matching phrases like "I'll look into" —
the next version of that failure would be worded differently, but the outcome never varies.

On `stalled` the route writes the stage's own nudge plus its chips, and makes **no second model
call**: the searches this turn already ran would be billed twice, and the model has just shown it is
not going to run the one that mattered.

### Chips read the stage

`suggestQuickReplies` delegates to `planStage(trip).replies`. The generic branch is deleted. Client
and server compute the same stage from the same trip, so the chips and the agent are answering the
same question.

### The plan moving on is itself the trigger

`PlannerScreen` watches the stage. On an advance: debounce 1.5 s (so an outbound and a return are
one moment, not two interruptions), never while a turn is in flight, at most once per stage, and
never before the conversation has started — a plan opened from someone else's link sits still.

The prompt goes in as a *visible* user message ("Added the flights — where should we stay?"). They
really did just do that, and a transcript with invisible turns is one nobody can follow.

### Prompt: 174 → ~100 lines, no sequencing

Kept: date rules, plan ownership, voice, data honesty, screen hints. Deleted wholesale:
`DID THEY SAY WHAT THEY WANT`, `ONE STEP AT A TIME`, `CLOSE THE LOOP`, `ALWAYS OFFER THE NEXT MOVE`,
`GUIDED CHOICES`, `ASK BEFORE ASSUMING THE SHAPE OF THE FLIGHT`, most of `MOVE FAST`. Added one
`THIS TURN` block from the stage, and one new prohibition naming the reported failure directly:
*never announce an intention you are not carrying out in the same turn.*

Round-trip vs one-way stops being a question: round trip when the dates are a range, with
"Show me one-ways" as a chip.

## Model

Staying on `gemini-2.5-flash`. Most of what was breaking it was the contradictions, and the turn
contract now catches the failure either way. Re-measure before spending more.

## Residual

If the traveler types a destination as free text *and* the agent fails to call `setTripMeta`, the
stage stays `destination` and the chips stay inspirational. They are now at least consistent with
what the agent was told to do that turn — but the composer still cannot seed a destination from
free text.
