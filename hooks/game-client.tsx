// The game's surface module: runs on the drawing side with its own frame
// clock, keys and clicks, so play needs no round trip through the hooks.
// It posts to the hooks module: `{ flap }` (the hooks play the sound),
// `{ score }` when a run ends, `{ close }` on q.
import type { ClientModule, ClientSurface } from 'claude-code'

import { newGame, rows, paint, step, type Game } from './game.ts'

type Props = { best?: number }
type State = { game: Game; flap: boolean }

const TICK_MS = 33
const MIN_COLUMNS = 20
// The score line plus enough sky for the mascot to fly through a gap.
const MIN_ROWS = 11
const FLAP_KEYS = new Set([' ', 'space', 'up', 'w', 'k', 'return'])

// Instances whose clock and input are wired; the surface object is the
// same for every call of one instance.
const started = new WeakSet<object>()

function wire(surface: ClientSurface<State>) {
  started.add(surface)
  const flap = () => {
    const state = surface.state
    if (!state) return
    surface.setState({ ...state, flap: true })
    surface.post({ flap: true })
  }
  surface.onKey(e => {
    if (FLAP_KEYS.has(e.key)) flap()
    else if (e.key === 'q') surface.post({ close: true })
  })
  surface.onPointer(e => {
    if (e.type === 'down') flap()
  })
  surface.every(TICK_MS, () => {
    const columns = surface.columns
    const height = (surface.rows - 1) * 2
    if (columns < MIN_COLUMNS || surface.rows < MIN_ROWS) return
    const state = surface.state
    if (!state || state.game.width !== columns || state.game.height !== height) {
      surface.setState({ game: newGame(columns, height, Math.random() * 1e9 + 1), flap: false })
      return
    }
    const game = step(state.game, state.flap)
    if (game.phase === 'over' && state.game.phase !== 'over') surface.post({ score: game.score })
    surface.setState({ game, flap: false })
  })
}

const Flappy: ClientModule<Props, State> = (props, surface) => {
  if (!started.has(surface)) wire(surface)
  const { Box, Text } = surface.elements
  const state = surface.state
  if (surface.columns > 0 && (surface.columns < MIN_COLUMNS || surface.rows < MIN_ROWS)) {
    return <Text dimColor>Flappy Claude needs {MIN_ROWS} rows: make the terminal taller.</Text>
  }
  if (!state) return <Text dimColor>Loading…</Text>

  const { game } = state
  const best = Math.max(props.best ?? 0, game.score)
  const hint = game.phase === 'ready'
    ? 'Click here, then Space or ↑ to flap'
    : game.phase === 'over' ? 'Game over - Space to retry, q to close' : ''
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={3}>
        <Text dimColor>Best {best}</Text>
        {hint !== '' && <Text color={game.phase === 'over' ? 'red' : 'yellow'}>{hint}</Text>}
      </Box>
      {rows(paint(game, best), game.width, game.height).map(line => (
        <Text>
          {line.map(run => (
            <Text color={run.fg} backgroundColor={run.bg}>{run.text}</Text>
          ))}
        </Text>
      ))}
    </Box>
  )
}

export default Flappy
