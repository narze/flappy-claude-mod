# flappy-claude

A Flappy Bird-like game inside Claude Code, as a mod (a plugin of function hooks).

- Plays in the band above the prompt, drawn with half blocks (`▀`): one cell is 1x2 pixels, in color
- You fly the Claude mascot: a 9x5 orange critter with ears, eyes and four legs
- A flap sound on each flap (macOS, through `afplay`)
- Runs in a `Client` surface module: its own 30 fps frame clock, keys and clicks, no round trip through the hooks
- Best score kept across sessions in `$.store`

## Play

1. Type `/flappy-claude`. The game shows above the prompt: up to 24 rows tall, at least 11.
2. Click the game, so it gets the keyboard.
3. Press **Space**, **↑**, `w`, `k` or **Enter** to flap. A click flaps too.
4. Fly through the gaps in the pipes. Each pipe you pass is one point. Ears may brush a pipe; the body may not.
5. After a crash, wait a moment, then flap to play again.
6. Press `q`, or type `/flappy-claude` again, to close it.

## Install

```sh
claude --plugin-dir /path/to/flappy-claude
```

## Develop

```sh
claude plugin validate .
claude plugin test .
npx -p typescript tsc -p .   # after Claude Code has loaded the mod once (it writes .claude-plugin/types/)
```

| File | Role |
| --- | --- |
| `hooks/game.ts` | Pure rules and painting: gravity, flap, pipes, crashes, score, half-block rows |
| `hooks/game-client.tsx` | `Client` surface module: frame clock, keys, clicks; posts `{ flap }`, `{ score }`, `{ close }` |
| `hooks/register.tsx` | `/flappy-claude`, the band, the flap sound, best score in `$.store` |
| `sounds/flap.wav` | Flap sound, made by `scripts/make-sounds.py` (synthesized, no samples) |
| `hooks/*.test.ts` | Tests (`claude plugin test`) |
| `types/index.d.ts` | `$.state` contract (`best`, `isOpen`) |

## License

[MIT](LICENSE)
