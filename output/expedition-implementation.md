# Expedition prototype — implementation status

Implemented 2026-10-23 against `game-prototype-spec.md`.

## Play

Run `node tools/dev-server.mjs` from the project root, open `http://127.0.0.1:4173`, and select EXPEDITION. Select length, mass, or time; start a run; then choose a green-ringed map node or a next-room button below the map. Number keys 1–4 select answers. Space, Enter, or pressing the timing button resolves QTE. Ordinary questions have no countdown.

The existing Training drill remains accessible. Expedition and daily expedition use the new rules; legacy drill score records remain separate.

## Implemented

- Alternating player/enemy turns, four installed special skills, always-available basic attack, cooldowns, healing and guarding.
- Question → QTE on correct answers; immediate Bad on wrong answers, explanation, and an enforced three-second reading interval.
- Perfect/Good/Bad attack factors 120%/100%/75%; defense factors 75%/100%/115%. Correctness is recorded separately from QTE grade.
- Seeded branching map with eight layers plus a boss, optional elites, events, shop, treasure, and a guaranteed pre-boss rest.
- Three-way rewards, skill replacement, upgrades, four passive relics, repair kits, and limited shop purchases.
- Five nonrepeating events, visible costs, and no repeat claims. Review questions revisit missed conversion pairs.
- Saved ordinary runs, interrupted-QTE resolution, corrupted-save recovery, and persistent learning history after a completed or lost run.
- One ranked attempt per topic per Bangkok day, seeded daily practice, finish time and accuracy, topic-specific local leaderboards, and callsign editing. Leaving/hiding a ranked run makes it practice.
- Existing tutorial conversion answer corrected to 250 cm = 2.5 m.
- Original mission-map zoom/reveal reused on entering enemy rooms (1.2 seconds, skippable with the button or Escape).
- Original SpriteRenderer and idle/attack/hit/death frames reused through independently scoped DOM mounts.
- Original slash/ring/spark and purge-reticle effects reused for attacks and kills; incoming damage, healing and guarding appear by player HP.
- Animation input locks release after feedback; cancellation clears timers/frames and ignores image loads from old renders. Reduced-motion mode uses still poses and skips entry delays.
- Map redesigned as a left-to-right parchment atlas based on the user's reference: curved dotted paths, custom SVG room symbols, current-position marker, faded inaccessible branches, a legend, and explicit next-room choices. The saved graph and encounter rules remain intact.
- QTE reduced from 1,500ms to 850ms, with shared display/scoring zone settings and a transform-driven cursor. Pointer input resolves on press rather than release.
- Correct combat answers advance automatically after impact feedback (340ms normally / 640ms on kills, then 160ms); wrong answers still require at least three seconds of explanation and a manual continue. Event choices/results remain manual.
- Expedition sprite playback runs at 1.5x the legacy animation speed. Combat/HUD layout is more compact on narrow screens; skill inventory is collapsed under the atlas.
- Finish-time rankings and daily attempt keys use a timing revision, so slower old records are retained in the archive but excluded from the faster revision's leaderboard.

## Validation

Run:

```text
node --test tools/expedition.test.mjs tools/expedition-ui.test.mjs tools/expedition-effects.test.mjs tools/route-map.test.mjs tools/startup.test.mjs tools/regression.mjs
```

43 tests pass: 500 generated map seeds and horizontal layouts, 3,000 question samples, combat factors, wrong-answer delay, cooldowns, full seeded victories, save/restore, duplicate rewards/purchases, daily attempts, timing-revision record separation, local record sorting, QTE duration/zone/cursor checks, automatic progression and cancellation, UI-controller state transitions, actual main-module startup/menu wiring against a DOM test boundary, eight animation lifecycle/asset checks, and seven existing regression checks.

New module/style files return HTTP 200 from the local preview server. Syntax and whitespace checks pass.

## Verification limits and later work

- No connected browser was available in this session. Real desktop/mobile rendering, touch QTE timing, screen-reader flow, and sound have not been visually or interactively verified. DOM-boundary tests do not replace browser QA.
- A 10–15 minute run is a design target; learner playtests must verify duration, difficulty and QTE fatigue.
- Endless, classroom codes, shared online rankings, and server-side result validation are subsequent phases, not implemented here.
- Local rankings are personal records, not tamper-proof competition results. Only ranked runs with a common topic/day/ruleset use the shared challenge conditions.
- Existing sprite animations and effects are now connected. Their visual timing still needs a real-browser pass; audio integration remains separate.

## Modules

- `js/systems/Expedition.js`: seeded questions/map and expedition state transitions.
- `js/systems/ExpeditionStore.js`: persistence, learning archive and local finish-time rankings.
- `js/ExpeditionUI.js`: Thai setup/map/combat/reward/room/summary interface.
- `js/systems/ExpeditionEffects.js`: scoped sprite playback, entry reveal, combat feedback and cancellation.
- `js/ui/routeMap.js`: deterministic horizontal map coordinates, path curves and custom room icons.
- `css/expedition.css`: scanner-HUD layout, narrow-screen rules and reduced-motion styling.

Existing pending edits in `SaveSystem.js`, `Player.js`, and earlier `main.js` fixes were retained.
