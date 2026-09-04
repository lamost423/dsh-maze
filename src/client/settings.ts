/**
 * Per-browser plugin preferences. The host has no config channel into a
 * static client plugin (profile patch-layer config never reaches the browser
 * half), so preferences persist in localStorage and travel with the browser
 * profile — the ecosystem precedent (better-sidebar) does the same.
 */

/** Preferences persisted under the versioned key. */
export interface MazeSettings {
  /** Whether the sidebar footer shows the Maze trigger (issue #11). */
  sidebarEntry: boolean
}

const STORAGE_KEY = 'dsh-maze:v1:settings'

const DEFAULTS: MazeSettings = { sidebarEntry: true }

/** Lazy so tests can stub localStorage before the first read. */
let current: MazeSettings | undefined
const listeners = new Set<() => void>()

function load(): MazeSettings {
  // Storage can be absent (node tests), blocked (privacy modes throw on
  // access), or hold corrupted JSON — every failure runs on defaults.
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (raw === null || raw === undefined) return { ...DEFAULTS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS }
    return { sidebarEntry: (parsed as { sidebarEntry?: unknown }).sidebarEntry !== false }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Current preferences (stable reference between updates — uSES-safe). */
export function getMazeSettings(): MazeSettings {
  current ??= load()
  return current
}

/** Merge a patch, persist it, and notify subscribers. */
export function updateMazeSettings(patch: Partial<MazeSettings>): void {
  current = { ...getMazeSettings(), ...patch }
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage refused the write: the flip still applies for this page's lifetime.
  }
  for (const listener of [...listeners]) listener()
}

/** Subscribe to preference changes; returns the unsubscriber. */
export function subscribeMazeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
