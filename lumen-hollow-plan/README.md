# Lumen Hollow Claude Code Plans

Use these files as small context windows.

| Shortcut | File | Work |
|---|---|---|
| `@1` | `1-welcome-and-game-states.md` | Welcome + game states |
| `@2` | `2-three-level-foundation.md` | Three levels |
| `@3` | `3-enemies.md` | Enemies |
| `@4` | `4-treasure-and-puzzles.md` | Treasure + puzzles |
| `@5` | `5-checkpoints.md` | Checkpoints |
| `@6` | `6-five-minute-timer.md` | 5 minute timer |
| `@7` | `7-level-completion.md` | Level completion |
| `@8` | `8-progression-and-save.md` | Level unlock + save |
| `@9` | `9-pause-and-polish.md` | Pause + polish |
| `@10` | `10-final-qa-and-deployment.md` | QA + deployment |

Claude Code does not normally interpret `@3` as a file unless your environment supports that shorthand. The safest form is:

`@plan/3-enemies.md`

Then say:

`Implement this milestone. Inspect the existing code first. Preserve working systems. Do not commit. Give me a test checklist and stop.`

If you specifically want to type only `@3`, you can create a tiny custom Claude Code instruction/skill that maps `@3` to this file.
