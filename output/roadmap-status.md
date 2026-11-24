# Unit Hunter roadmap status

## Completed

- Data-driven boss phases with telegraph transition
- Data-driven enemy behavior profiles
- Combat metrics through EventBus
- `main.js` syntax regression fixed

## Current slice

- Added in-memory `RunState`
- Added `RankCalculator`

## Verified assumption

The current AudioSystem uses HTML audio elements and short-lived Web Audio nodes. A search found no persistent combat source-node registry matching the earlier P2 concern, so no artificial cleanup layer was added.

## Remaining implementation slices

1. Wire RunState into the existing Player/RunManager lifecycle
2. Add mission/map state and UI flow
3. Render combat rank on game over
4. Add Heal/Treasure random events
5. Run full regression checks and review all commits
