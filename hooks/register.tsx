import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const FLAP_SOUND = 'sounds/flap.wav'
// Rows the game takes above the prompt, its score line included.
const BAND_ROWS = 24

// The best score, kept across sessions in $.store; the band redraws on change.
const best = atom({ plugin: 'flappy-claude', key: 'best' } as const, 0)
// Whether the game shows above the prompt.
const isOpen = atom({ plugin: 'flappy-claude', key: 'isOpen' } as const, false)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'flappy-claude',
      description: 'Play Flappy Claude above the prompt (again to close)',
    })
    const stored = await $.store.get('best').catch(() => undefined)
    if (typeof stored === 'number') await update($, best, () => stored)
    return next(e)
  })

  on('command.run', { command: 'flappy-claude' }, async $ => {
    const open = !(await read($, isOpen))
    await update($, isOpen, () => open)
    return {
      text: open
        ? 'Flappy Claude is above the prompt - click it, then Space or ↑ to flap; q or /flappy-claude closes.'
        : 'Flappy Claude closed.',
    }
  })

  // The game posts `{ flap }` on each flap, `{ score }` when a run ends and
  // `{ close }` on q.
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'game') return next(e)
    const data = (e.data ?? {}) as { flap?: unknown; score?: unknown; close?: unknown }
    if (data.close === true) {
      await update($, isOpen, () => false)
      return {}
    }
    if (data.flap === true) {
      void $.audio.play({ asset: FLAP_SOUND }).catch(() => undefined)
      return {}
    }
    if (typeof data.score !== 'number') return next(e)
    const top = Math.max(data.score, await read($, best))
    if (top > (await read($, best))) {
      await update($, best, () => top)
      await $.store.set('best', top)
    }
    return { props: { best: top } }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shows = await read($, isOpen)
    if (!shows || e.props.hasSurvey || (e.surface !== 'terminal' && e.surface !== 'desktop')) return next(e)
    const { Client } = $.ui.resolve(e)
    const top = await read($, best)
    return (
      <Client
        key="game"
        module="./game-client.tsx"
        props={{ best: top }}
        width={e.props.bodyColumns}
        height={Math.max(1, Math.min(BAND_ROWS, e.props.maxRows - 1))}
      />
    )
  })
}
