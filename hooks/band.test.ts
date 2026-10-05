import type { On, RenderElement } from 'claude-code'
import { expect, test, type Engine } from 'claude-code/testing'

const BAND = {
  plugin: 'flappy-claude',
  surface: 'terminal' as const,
  component: 'AbovePrompt' as const,
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 19, contentRows: 16 },
    view: {},
  } as never,
}

// Beneath the plugin: the engine's calls it makes, answered in memory.
function fakeEngine(on: On, entries: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(entries))
  const played: string[] = []
  on('session.start', async ($, e) => ({ cwd: e.cwd }))
  on('command.register', async ($, e) => ({ value: { command: e.name } }))
  on('store.get', async ($, e) => ({ value: store.get(e.key) }))
  on('store.set', async ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('audio.play', async ($, e) => {
    played.push(String(e.clip.asset))
    return { value: undefined }
  })
  // The engine's own band: one plain Text.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, 'engine band') as RenderElement
  })
  return { store, played }
}

async function open($: Engine) {
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  return $.command.run({ command: 'flappy-claude', args: '' } as never)
}

async function mountGame($: Engine) {
  const ui = await $.ui.mount(BAND)
  await ui.resize({ columns: 60, rows: 16, in: 'game' })
  await ui.advance(66)
  return ui
}

test('/flappy-claude shows the game above the prompt; again hides it', async ($, on) => {
  fakeEngine(on)
  const ran = await open($)
  expect(ran.text).toContain('above the prompt')
  const ui = await mountGame($)
  expect(await ui.find({ text: /to flap/, in: 'game' })).toBeDefined()
  const again = await $.command.run({ command: 'flappy-claude', args: '' } as never)
  expect(again.text).toContain('closed')
  expect(await ui.find({ text: 'engine band' })).toBeDefined()
  await ui.unmount()
})

test('the game is 24 rows tall when there is room, else what fits', async ($, on) => {
  fakeEngine(on)
  await open($)
  const roomy = await $.ui.mount({ ...BAND, props: { ...(BAND.props as object), maxRows: 40 } as never })
  expect((await roomy.find({ key: 'game' }))?.props.height).toBe(24)
  await roomy.unmount()
  const tight = await $.ui.mount(BAND)
  expect((await tight.find({ key: 'game' }))?.props.height).toBe(19)
  await tight.unmount()
})

test('the band stays the engine one until the game is opened', async ($, on) => {
  fakeEngine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ text: 'engine band' })).toBeDefined()
  await ui.unmount()
})

test('Space starts the game with a flap sound, and a crash says game over', async ($, on) => {
  const { played } = fakeEngine(on)
  await open($)
  const ui = await mountGame($)
  await ui.key({ key: ' ', in: 'game' })
  expect(played).toEqual(['sounds/flap.wav'])
  await ui.advance(33 * 5)
  expect(await ui.find({ text: /to flap/, in: 'game' })).toBeUndefined()
  expect(await ui.find({ text: /Score/, in: 'game' })).toBeUndefined() // drawn in the sky now
  await ui.advance(33 * 120)
  expect(await ui.find({ text: /Game over/, in: 'game' })).toBeDefined()
  await ui.unmount()
})

test('a click flaps too, with the sound', async ($, on) => {
  const { played } = fakeEngine(on)
  await open($)
  const ui = await mountGame($)
  await ui.pointer({ type: 'down', x: 5, y: 5, button: 'left', in: 'game' })
  await ui.advance(66)
  expect(await ui.find({ text: /to flap/, in: 'game' })).toBeUndefined()
  expect(played).toEqual(['sounds/flap.wav'])
  await ui.unmount()
})

test('q closes the game', async ($, on) => {
  fakeEngine(on)
  await open($)
  const ui = await mountGame($)
  await ui.key({ key: 'q', in: 'game' })
  expect(await ui.find({ text: 'engine band' })).toBeDefined()
  await ui.unmount()
})

test('a posted score becomes the best and is kept in the store', async ($, on) => {
  const { store } = fakeEngine(on, { best: 3 })
  await open($)
  const ui = await mountGame($)
  expect(await ui.find({ text: /Best 3/, in: 'game' })).toBeDefined()
  await ui.post({ score: 7 }, { in: 'game' })
  expect(store.get('best')).toBe(7)
  await ui.advance(33)
  expect(await ui.find({ text: /Best 7/, in: 'game' })).toBeDefined()
  await ui.post({ score: 2 }, { in: 'game' })
  expect(store.get('best')).toBe(7)
  await ui.unmount()
})

test('a band too small to play says so', async ($, on) => {
  fakeEngine(on)
  await open($)
  const ui = await $.ui.mount(BAND)
  await ui.resize({ columns: 12, rows: 4, in: 'game' })
  await ui.advance(66)
  expect(await ui.find({ text: /taller|bigger/, in: 'game' })).toBeDefined()
  await ui.unmount()
})
