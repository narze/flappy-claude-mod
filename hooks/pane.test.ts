import type { On } from 'claude-code'
import { expect, test, type Engine } from 'claude-code/testing'

const PANE = {
  plugin: 'flappy-claude',
  surface: 'terminal' as const,
  component: 'Pane' as const,
  requestId: 'flappy-claude',
  props: {
    title: 'Flappy Claude',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 21, contentRows: 21 },
    view: {},
  } as never,
}

// Beneath the plugin: the engine's calls it makes, answered in memory.
function fakeEngine(on: On, entries: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(entries))
  const opened: string[] = []
  on('session.start', async ($, e) => ({ cwd: e.cwd }))
  on('command.register', async ($, e) => ({ value: { command: e.name } }))
  on('store.get', async ($, e) => ({ value: store.get(e.key) }))
  on('store.set', async ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('ui.open', async ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true as const } }
  })
  return { store, opened }
}

async function start($: Engine) {
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
}

test('/flappy-claude opens the game pane', async ($, on) => {
  const { opened } = fakeEngine(on)
  await start($)
  const ran = await $.command.run({ command: 'flappy-claude', args: '' } as never)
  expect(ran.text).toContain('Flappy Claude')
  expect(opened).toEqual(['flappy-claude'])
})

test('Space starts the game, the clock runs it, and a crash says game over', async ($, on) => {
  fakeEngine(on)
  await start($)
  const ui = await $.ui.mount(PANE)
  await ui.resize({ columns: 60, rows: 21, in: 'game' })
  await ui.advance(66)
  expect(await ui.find({ text: /to flap/, in: 'game' })).toBeDefined()
  await ui.key({ key: ' ', in: 'game' })
  await ui.advance(33 * 5)
  expect(await ui.find({ text: /Score 0/, in: 'game' })).toBeDefined()
  expect(await ui.find({ text: /to flap/, in: 'game' })).toBeUndefined()
  await ui.advance(33 * 120)
  expect(await ui.find({ text: /Game over/, in: 'game' })).toBeDefined()
  await ui.unmount()
})

test('a click flaps too', async ($, on) => {
  fakeEngine(on)
  await start($)
  const ui = await $.ui.mount(PANE)
  await ui.resize({ columns: 60, rows: 21, in: 'game' })
  await ui.advance(66)
  await ui.pointer({ type: 'down', x: 5, y: 5, button: 'left', in: 'game' })
  await ui.advance(66)
  expect(await ui.find({ text: /Score 0/, in: 'game' })).toBeDefined()
  await ui.unmount()
})

test('a posted score becomes the best and is kept in the store', async ($, on) => {
  const { store } = fakeEngine(on, { best: 3 })
  await start($)
  const ui = await $.ui.mount(PANE)
  await ui.resize({ columns: 60, rows: 21, in: 'game' })
  await ui.advance(66)
  expect(await ui.find({ text: /Best 3/, in: 'game' })).toBeDefined()
  await ui.post({ score: 7 }, { in: 'game' })
  expect(store.get('best')).toBe(7)
  await ui.advance(33)
  expect(await ui.find({ text: /Best 7/, in: 'game' })).toBeDefined()
  await ui.post({ score: 2 }, { in: 'game' })
  expect(store.get('best')).toBe(7)
  await ui.unmount()
})

test('a pane too small to play says so', async ($, on) => {
  fakeEngine(on)
  await start($)
  const ui = await $.ui.mount(PANE)
  await ui.resize({ columns: 12, rows: 4, in: 'game' })
  await ui.advance(66)
  expect(await ui.find({ text: /bigger/, in: 'game' })).toBeDefined()
  await ui.unmount()
})
