// Pure Flappy Bird rules and painting, in pixels: one terminal cell is one
// pixel wide and two tall (a half block), so `height` is twice the rows.

export type Phase = 'ready' | 'playing' | 'over'
export type Pipe = { x: number; gapTop: number; isScored: boolean }
export type Game = {
  width: number
  height: number
  gap: number
  seed: number
  phase: Phase
  birdY: number
  velocity: number
  pipes: Pipe[]
  score: number
  ticks: number
  overTicks: number
}
export type Run = { text: string; fg: string; bg: string }

// Tuned for 30 ticks a second, on the easy side: a gentle fall, slow
// pipes far apart, and a gap about half the play height.
const GRAVITY = 0.11
const FLAP = -1.3
const MAX_FALL = 1.8
const SPEED = 0.45
const SPACING = 30
const MARGIN = 3
// Ticks after a crash before a flap may restart, so a late flap does not.
const RESTART_DELAY = 15

// The Claude mascot, one character per pixel: '#' body, 'e' eye, '.' sky.
export const MASCOT = [
  '.#######.',
  '##e###e##',
  '.#######.',
  '.#######.',
  '.#.#.#.#.',
] as const
export const BIRD_WIDTH = 9
export const BIRD_HEIGHT = 5
// Crashes count the body columns only: brushing a pipe with an ear is fair.
const HIT_LEFT = 1
const HIT_RIGHT = BIRD_WIDTH - 1
export const PIPE_WIDTH = 6
export const GROUND = 2

export const COLORS = {
  sky: '#4ec0ca',
  pipe: '#73bf2e',
  pipeEdge: '#3f7d1a',
  grass: '#5ee270',
  ground: '#ded895',
  bird: '#d97757',
  eye: '#000000',
  title: '#ffffff',
  titleShadow: '#2a6d74',
  best: '#f8d81f',
} as const

export const birdX = (width: number) => Math.floor(width / 4)

// Not a color: marks an eye after a crash, which `rows` draws as an 'X'.
export const DEAD_EYE = 'dead-eye'

// Where the title starts, in pixels from the top.
export const TITLE_TOP = 3
const GLYPH_WIDTH = 3
const GLYPH_HEIGHT = 5

// A 3x5 pixel font: just the letters and digits the title screen needs.
const FONT: Record<string, readonly string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  L: ['#..', '#..', '#..', '#..', '###'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
}

const textWidth = (text: string) => text.length * (GLYPH_WIDTH + 1) - 1

export function newGame(width: number, height: number, seed: number): Game {
  return {
    width,
    height,
    gap: Math.min(height - GROUND - 6, Math.max(BIRD_HEIGHT + 8, Math.round(height * 0.5))),
    seed: Math.abs(Math.floor(seed)) % 0x7fffffff || 1,
    phase: 'ready',
    birdY: height / 2,
    velocity: 0,
    pipes: [],
    score: 0,
    ticks: 0,
    overTicks: 0,
  }
}

function nextSeed(seed: number) {
  return (seed * 1103515245 + 12345) % 0x7fffffff
}

// The columns a pipe covers, rounded the same way for drawing and hits.
const pipeLeft = (pipe: Pipe) => Math.round(pipe.x)

function hits(game: Game, pipe: Pipe): boolean {
  const x = birdX(game.width)
  const left = pipeLeft(pipe)
  const overlapsX = x + HIT_LEFT < left + PIPE_WIDTH && x + HIT_RIGHT > left
  const top = game.birdY
  const bottom = game.birdY + BIRD_HEIGHT
  return overlapsX && (top < pipe.gapTop || bottom > pipe.gapTop + game.gap)
}

export function step(game: Game, flap: boolean): Game {
  const ticks = game.ticks + 1
  if (game.phase === 'ready') {
    if (flap) return { ...game, phase: 'playing', velocity: FLAP, ticks }
    return { ...game, ticks, birdY: game.height / 2 + Math.sin(ticks / 6) }
  }
  if (game.phase === 'over') {
    if (flap && game.overTicks >= RESTART_DELAY) {
      return step(newGame(game.width, game.height, nextSeed(game.seed)), true)
    }
    return { ...game, ticks, overTicks: game.overTicks + 1 }
  }

  const velocity = flap ? FLAP : Math.min(MAX_FALL, game.velocity + GRAVITY)
  let birdY = Math.max(0, game.birdY + velocity)
  const floor = game.height - GROUND - BIRD_HEIGHT
  let seed = game.seed
  let score = game.score
  const x = birdX(game.width)
  const pipes = game.pipes
    .map(pipe => ({ ...pipe, x: pipe.x - SPEED }))
    .filter(pipe => pipe.x + PIPE_WIDTH > 0)
    .map(pipe => {
      if (pipe.isScored || pipeLeft(pipe) + PIPE_WIDTH > x + HIT_LEFT) return pipe
      score++
      return { ...pipe, isScored: true }
    })
  const last = pipes[pipes.length - 1]
  if (!last || last.x < game.width - SPACING) {
    seed = nextSeed(seed)
    const room = game.height - GROUND - game.gap - MARGIN * 2
    pipes.push({ x: game.width, gapTop: MARGIN + (seed % Math.max(1, room + 1)), isScored: false })
  }

  const moved: Game = { ...game, ticks, velocity, birdY, pipes, score, seed }
  if (birdY >= floor) {
    birdY = floor
    return { ...moved, birdY, velocity: 0, phase: 'over', overTicks: 0 }
  }
  if (pipes.some(pipe => hits(moved, pipe))) return { ...moved, phase: 'over', overTicks: 0 }
  return moved
}

// Every pixel's color, row-major, `width * height`. Before the first flap
// the sky also shows the title and `best`.
export function paint(game: Game, best = 0): string[] {
  const { width, height } = game
  const pixels = new Array<string>(width * height).fill(COLORS.sky)
  const set = (x: number, y: number, color: string) => {
    if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = color
  }
  // `text` centered with its top at `top`; a shadow one pixel down-right.
  const write = (text: string, top: number, color: string, shadow?: string) => {
    const left = Math.floor((width - textWidth(text)) / 2)
    const ink = (inkColor: string, offset: number) =>
      [...text].forEach((char, i) => {
        FONT[char]?.forEach((line, dy) => {
          for (let dx = 0; dx < GLYPH_WIDTH; dx++) {
            if (line[dx] === '#') set(left + i * (GLYPH_WIDTH + 1) + dx + offset, top + dy + offset, inkColor)
          }
        })
      })
    if (shadow) ink(shadow, 1)
    ink(color, 0)
  }
  if (game.phase === 'ready') {
    const clearAbove = Math.floor(game.height / 2) - 2
    const title = textWidth('FLAPPY CLAUDE') + 2 <= width ? ['FLAPPY CLAUDE'] : ['FLAPPY', 'CLAUDE']
    const fits = title.every(line => textWidth(line) + 2 <= width)
    const titleBottom = TITLE_TOP + title.length * (GLYPH_HEIGHT + 1) - 1
    if (fits && titleBottom < clearAbove) {
      title.forEach((line, i) => write(line, TITLE_TOP + i * (GLYPH_HEIGHT + 1), COLORS.title, COLORS.titleShadow))
      const bestTop = titleBottom + 2
      const bestText = `BEST ${best}`
      if (bestTop + GLYPH_HEIGHT < clearAbove && textWidth(bestText) <= width) write(bestText, bestTop, COLORS.best)
    }
  }
  for (const pipe of game.pipes) {
    const left = pipeLeft(pipe)
    for (let y = 0; y < height - GROUND; y++) {
      if (y >= pipe.gapTop && y < pipe.gapTop + game.gap) continue
      const isLip = y === pipe.gapTop - 1 || y === pipe.gapTop + game.gap
      for (let i = 0; i < PIPE_WIDTH; i++) {
        const isEdge = i === 0 || i === PIPE_WIDTH - 1
        set(left + i, y, isLip || isEdge ? COLORS.pipeEdge : COLORS.pipe)
      }
    }
  }
  for (let x = 0; x < width; x++) {
    set(x, height - GROUND, COLORS.grass)
    for (let y = height - GROUND + 1; y < height; y++) set(x, y, COLORS.ground)
  }
  const bx = birdX(width)
  const by = Math.round(game.birdY)
  MASCOT.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      const pixel = line[dx]
      if (pixel === '#') set(bx + dx, by + dy, COLORS.bird)
      else if (pixel === 'e') set(bx + dx, by + dy, game.phase === 'over' ? DEAD_EYE : COLORS.eye)
    }
  })
  return pixels
}

// Half-block rows: each cell '▀', top pixel as fg, bottom as bg; equal
// neighbours merge into one run, so a row is a few Text elements.
export function rows(pixels: string[], width: number, height: number): Run[][] {
  const lines: Run[][] = []
  for (let r = 0; r < height >> 1; r++) {
    const line: Run[] = []
    for (let x = 0; x < width; x++) {
      const fg = pixels[r * 2 * width + x] ?? COLORS.sky
      const bg = pixels[(r * 2 + 1) * width + x] ?? COLORS.sky
      const last = line[line.length - 1]
      if (fg === DEAD_EYE || bg === DEAD_EYE) {
        // The eye's cell is a black X over the body's half beside it.
        const other = fg === DEAD_EYE ? bg : fg
        line.push({ text: 'X', fg: COLORS.eye, bg: other === DEAD_EYE ? COLORS.bird : other })
      } else if (last && last.text.endsWith('▀') && last.fg === fg && last.bg === bg) last.text += '▀'
      else line.push({ text: '▀', fg, bg })
    }
    lines.push(line)
  }
  return lines
}
