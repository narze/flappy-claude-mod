import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const PANE = 'flappy-claude'
// The best score, kept across sessions in $.store; the pane redraws on change.
const best = atom({ plugin: 'flappy-claude', key: 'best' } as const, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'flappy-claude',
      description: 'Play Flappy Claude in a pane (Space or click to flap, Esc closes)',
    })
    const stored = await $.store.get('best').catch(() => undefined)
    if (typeof stored === 'number') await update($, best, () => stored)
    return next(e)
  })

  on('command.run', { command: 'flappy-claude' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Flappy Claude', focus: true, closeOnEscape: true, rows: 24, columns: 64 })
    return { text: 'Flappy Claude - click the game, then Space or ↑ to flap. Esc closes.' }
  })

  // The game posts `{ score }` when a run ends.
  on('ui.message', async ($, e, next) => {
    const data = e.data as { score?: unknown } | undefined
    if (e.requestId !== PANE || typeof data?.score !== 'number') return next(e)
    const score = data.score
    const top = Math.max(score, await read($, best))
    if (top > (await read($, best))) {
      await update($, best, () => top)
      await $.store.set('best', top)
    }
    return { props: { best: top } }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>Flappy Claude plays in the terminal or the desktop app.</Text>
    }
    const { Client } = $.ui.resolve(e)
    const top = await read($, best)
    return (
      <Client
        key="game"
        module="./game-client.tsx"
        props={{ best: top }}
        width="100%"
        height={Math.max(6, e.props.scroll.bodyRows)}
      />
    )
  })
}
