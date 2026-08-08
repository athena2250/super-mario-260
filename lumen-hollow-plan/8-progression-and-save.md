# Milestone 8 — Level Select + Persistent Progress

Read `@plan/00-OVERVIEW.md` first.

## Goal

Add level selection and save progression using browser localStorage.

## Initial state

LEVEL 1 — UNLOCKED
LEVEL 2 — LOCKED
LEVEL 3 — LOCKED

After Level 1:
LEVEL 1 — COMPLETED
LEVEL 2 — UNLOCKED
LEVEL 3 — LOCKED

After Level 2:
LEVEL 1 — COMPLETED
LEVEL 2 — COMPLETED
LEVEL 3 — UNLOCKED

After Level 3:
`ADVENTURE COMPLETE!`

## Level Select

Allow replay of all unlocked levels.
Locked levels should be visually obvious.

## Persistence

Store in localStorage:
- Unlocked levels
- Completed levels
- Optional best completion times
- Optional best scores

Refreshing the browser must preserve progress.

Do not introduce a backend.

## Safety

Handle missing, malformed or old localStorage data gracefully.

## Test

Test:
- First launch
- Unlock Level 2
- Unlock Level 3
- Refresh browser
- Close/reopen browser
- Replay an unlocked level
- Locked level access
- Clearing localStorage

Do not commit.
