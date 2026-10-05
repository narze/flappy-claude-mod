# flappy-claude

A Flappy Bird-like game inside Claude Code, as a mod (a plugin of function hooks).

- Plays in a pane, drawn with half blocks (`▀`): one cell is 1x2 pixels, in color
- Runs in a `Client` surface module: its own 30 fps frame clock, keys and clicks, no round trip through the hooks
- Best score kept across sessions in `$.store`

## Play

1. Type `/flappy-claude`. A pane opens.
2. Click the game, so it gets the keyboard.
3. Press **Space**, **↑**, `w`, `k` or **Enter** to flap. A click flaps too.
4. Fly through the gaps in the pipes. Each pipe you pass is one point.
5. After a crash, wait a moment, then flap to play again. **Esc** closes the pane.

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
| `hooks/game-client.tsx` | `Client` surface module: frame clock, keys, clicks; posts `{ score }` at a crash |
| `hooks/register.tsx` | `/flappy-claude`, the pane, best score in `$.store` |
| `hooks/*.test.ts` | Tests (`claude plugin test`) |
| `types/index.d.ts` | `$.state` contract (`best`) |

## License

[MIT](LICENSE)
