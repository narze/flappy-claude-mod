import { expect, test } from 'claude-code/testing'

import { BIRD_HEIGHT, BIRD_WIDTH, COLORS, GROUND, MASCOT, PIPE_WIDTH, TITLE_TOP, birdX, newGame, paint, rows, step, type Game } from './game.ts'

const W = 60
const H = 40

function run(game: Game, ticks: number, flapEvery = 0): Game {
  let g = game
  for (let i = 0; i < ticks; i++) g = step(g, flapEvery > 0 && i % flapEvery === 0)
  return g
}

test('a new game waits for the first flap', () => {
  const g = newGame(W, H, 1)
  expect(g.phase).toBe('ready')
  expect(g.pipes).toEqual([])
  expect(g.score).toBe(0)
  const idle = run(g, 60)
  expect(idle.phase).toBe('ready')
  expect(Math.abs(idle.birdY - H / 2)).toBeLessThan(3)
})

test('a flap starts the game and lifts the bird; gravity pulls it down', () => {
  const g = step(newGame(W, H, 1), true)
  expect(g.phase).toBe('playing')
  expect(g.velocity).toBeLessThan(0)
  const up = run(g, 3)
  expect(up.birdY).toBeLessThan(H / 2)
  const down = run(g, 40)
  expect(down.birdY).toBeGreaterThan(up.birdY)
})

test('hitting the ground ends the game', () => {
  const over = run(step(newGame(W, H, 1), true), 200)
  expect(over.phase).toBe('over')
  expect(over.birdY + BIRD_HEIGHT).toBeLessThanOrEqual(H - GROUND + 1)
})

test('the ceiling stops the bird but does not end the game', () => {
  const g = run(step(newGame(W, H, 1), true), 20, 2)
  expect(g.birdY).toBeGreaterThanOrEqual(0)
  expect(g.phase).toBe('playing')
})

test('the gap always fits the mascot with room to spare', () => {
  for (const height of [26, 30, 40, 60]) {
    const g = newGame(W, height, 1)
    expect(g.gap).toBeGreaterThanOrEqual(BIRD_HEIGHT + 6)
    expect(g.gap).toBeLessThanOrEqual(height - GROUND - 6)
  }
})

test('the gap is about half the play height, so it is forgiving', () => {
  // 24 rows = 46 pixels: about half of the 44 above the ground
  expect(newGame(W, 46, 1).gap).toBeGreaterThanOrEqual(22)
  expect(newGame(W, 30, 1).gap).toBeGreaterThanOrEqual(BIRD_HEIGHT + 8)
})

test('pipes come slowly and far apart', () => {
  let g = step(newGame(120, 46, 3), true)
  for (let i = 0; i < 120; i++) g = step({ ...g, birdY: 20, velocity: 0 }, false)
  const xs = g.pipes.map(pipe => pipe.x)
  for (let i = 1; i < xs.length; i++) {
    expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(30)
    expect(xs[i]! - xs[i - 1]!).toBeLessThan(31)
  }
  // 120 ticks (4 s) move a pipe no more than 55 columns
  expect(120 - (xs[0] ?? 0)).toBeLessThanOrEqual(55)
})

test('pipes are 6 pixels wide', () => {
  expect(PIPE_WIDTH).toBe(6)
})

test('the mascot sprite is the 9x5 Claude critter', () => {
  expect(MASCOT.length).toBe(BIRD_HEIGHT)
  for (const line of MASCOT) expect(line.length).toBe(BIRD_WIDTH)
  expect(MASCOT).toEqual([
    '.#######.',
    '##e###e##',
    '.#######.',
    '.#######.',
    '.#.#.#.#.',
  ])
})

test('pipes scroll in from the right and are spawned with a gap', () => {
  const g = run(step(newGame(W, H, 7), true), 30, 9)
  expect(g.pipes.length).toBeGreaterThan(0)
  const pipe = g.pipes[0]!
  expect(pipe.x).toBeLessThan(W)
  expect(pipe.gapTop).toBeGreaterThan(0)
  expect(pipe.gapTop + g.gap).toBeLessThan(H - GROUND)
})

test('flying through a gap scores; touching a pipe ends the game', () => {
  const x = birdX(W)
  const base: Game = { ...step(newGame(W, H, 1), true), birdY: 14, velocity: 0 }
  // a pipe just behind the bird, its gap around the bird: passing it scores
  const passing: Game = { ...base, pipes: [{ x: x - PIPE_WIDTH + 0.2, gapTop: 10, isScored: false }] }
  const scored = step(passing, false)
  expect(scored.score).toBe(1)
  expect(scored.phase).toBe('playing')
  // a pipe at the bird with the gap far above: a hit
  const hitting: Game = { ...base, pipes: [{ x, gapTop: 0, isScored: false }], birdY: 20 }
  expect(step(hitting, false).phase).toBe('over')
})

function untilOver(game: Game): Game {
  let g = game
  while (g.phase !== 'over') g = step(g, false)
  return g
}

test('after game over a flap starts a fresh game, not at once', () => {
  const over = untilOver(step(newGame(W, H, 1), true))
  expect(step(over, true).phase).toBe('over')
  const later = run(over, 20)
  const again = step(later, true)
  expect(again.phase).toBe('playing')
  expect(again.score).toBe(0)
  expect(again.pipes).toEqual([])
})

test('paint draws sky, ground, bird and pipes into half-block rows', () => {
  const g: Game = { ...step(newGame(W, H, 1), true), pipes: [{ x: 40, gapTop: 10, isScored: false }] }
  const pixels = paint(g)
  expect(pixels.length).toBe(W * H)
  expect(pixels[0]).toBe(COLORS.sky)
  expect(pixels[(H - 1) * W]).toBe(COLORS.ground)
  const bx = birdX(W)
  const by = Math.round(g.birdY)
  expect(pixels[by * W + bx]).toBe(COLORS.sky) // corner outside the body
  expect(pixels[by * W + bx + 1]).toBe(COLORS.bird)
  expect(pixels[(by + 1) * W + bx]).toBe(COLORS.bird) // ear
  expect(pixels[(by + 1) * W + bx + 1]).toBe(COLORS.bird)
  expect(pixels[(by + 1) * W + bx + 2]).toBe(COLORS.eye)
  expect(pixels[(by + 3) * W + bx + 2]).toBe(COLORS.bird) // the new body row
  expect(pixels[(by + 4) * W + bx + 1]).toBe(COLORS.bird) // a leg
  expect(pixels[(by + 4) * W + bx + 2]).toBe(COLORS.sky) // between the legs
  expect(pixels[(by + 1) * W + bx + 6]).toBe(COLORS.eye)
  expect(pixels[2 * W + 41]).toBe(COLORS.pipe)
  expect(pixels[12 * W + 41]).toBe(COLORS.sky)

  const lines = rows(pixels, W, H)
  expect(lines.length).toBe(H / 2)
  for (const line of lines) {
    expect(line.reduce((n, run) => n + run.text.length, 0)).toBe(W)
  }
  // runs merge equal neighbours: sky, the pipe's edge, pipe, edge, sky
  expect(lines[0]?.map(run => [run.text.length, run.fg])).toEqual([
    [40, COLORS.sky], [1, COLORS.pipeEdge], [4, COLORS.pipe], [1, COLORS.pipeEdge], [14, COLORS.sky],
  ])
  const clear = rows(paint({ ...g, pipes: [] }), W, H)
  expect(clear[0]).toEqual([{ text: '▀'.repeat(W), fg: COLORS.sky, bg: COLORS.sky }])
})

function colored(pixels: string[], color: string) {
  return pixels.reduce((n, pixel) => n + (pixel === color ? 1 : 0), 0)
}

test('before the first flap the sky shows the title and the best score', () => {
  const ready = newGame(60, 46, 1)
  const pixels = paint(ready, 12)
  expect(colored(pixels, COLORS.title)).toBeGreaterThan(40)
  expect(colored(pixels, COLORS.titleShadow)).toBeGreaterThan(20)
  expect(colored(pixels, COLORS.best)).toBeGreaterThan(20)
  // "FLAPPY CLAUDE" is 13 glyphs of 3x5 with 1 gap: 51 wide, centered
  const left = Math.floor((60 - 51) / 2)
  const top = TITLE_TOP
  expect([0, 1, 2].map(dx => pixels[top * 60 + left + dx])).toEqual([COLORS.title, COLORS.title, COLORS.title])
  expect(pixels[(top + 1) * 60 + left + 1]).toBe(COLORS.titleShadow)
})

test('the title goes away once the game starts', () => {
  const playing = step(newGame(60, 46, 1), true)
  const pixels = paint(playing, 12)
  expect(colored(pixels, COLORS.title)).toBe(0)
  expect(colored(pixels, COLORS.best)).toBe(0)
})

test('a narrow sky splits the title into two lines', () => {
  const pixels = paint(newGame(40, 46, 1), 3)
  const left = Math.floor((40 - 23) / 2) // "FLAPPY": 6 glyphs, 23 wide
  expect(pixels[TITLE_TOP * 40 + left]).toBe(COLORS.title)
  const second = TITLE_TOP + 6
  const leftClaude = Math.floor((40 - 23) / 2)
  expect(pixels[second * 40 + leftClaude + 1]).toBe(COLORS.title) // C's top
})

test('a short sky keeps the title clear of the mascot and drops the best score', () => {
  const g = newGame(60, 20, 1)
  const pixels = paint(g, 9)
  expect(colored(pixels, COLORS.best)).toBe(0)
  expect(colored(pixels, COLORS.bird)).toBeGreaterThan(0)
})
