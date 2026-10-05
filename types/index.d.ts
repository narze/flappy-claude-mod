export type FlappyBest = number

declare module 'claude-code' {
  interface PluginState {
    'flappy-claude': { best: FlappyBest }
  }
}
