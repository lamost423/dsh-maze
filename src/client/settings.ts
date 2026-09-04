/**
 * Per-browser plugin preferences, persisted in localStorage.
 *
 * Why not the Host settings document: `ctx.settingsScope` (ui-settings) does
 * carry durable preferences into browser plugins, but only for a namespace
 * registered by the plugin's Host half — ours is a deliberate no-op — and it
 * goes inert on non-loopback pages. Per-browser storage covers one UI switch
 * without growing a Host half; better-sidebar made the same call.
 */

/** Preferences persisted under the versioned key. */
export interface MazeSettings {
  /** Whether the sidebar footer shows the Maze trigger (issue #11). */
  sidebarEntry: boolean
}

const STORAGE_KEY = 'dsh-maze:v1:settings'

const DEFAULTS: MazeSettings = { sidebarEntry: true }

let current: MazeSettings | undefined
const listeners = new Set<() => void>()
let watchingStorage = false

/**
 * Coerce a stored payload: known fields to their types, unknown keys kept so
 * an older build touching the switch never erases a newer build's preference
 * under the shared key.
 */
function coerce(raw: unknown): MazeSettings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...DEFAULTS }
  const record = raw as Record<string, unknown>
  return {
    ...record,
    sidebarEntry: typeof record.sidebarEntry === 'boolean' ? record.sidebarEntry : DEFAULTS.sidebarEntry,
  } as MazeSettings
}

function load(): MazeSettings {
  // Storage can be absent (node tests), blocked (privacy modes throw on the
  // property access itself), or hold corrupted JSON — every failure runs on defaults.
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    return raw === null || raw === undefined ? { ...DEFAULTS } : coerce(JSON.parse(raw))
  } catch {
    return { ...DEFAULTS }
  }
}

function shallowEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key])
}

/** One failing subscriber must not starve the rest (host broadcast paths do the same). */
function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch (error) {
      console.error('[dsh-maze] settings listener failed', error)
    }
  }
}

/** Another tab's write invalidates this tab's cache and re-notifies. */
function watchStorage(): void {
  if (watchingStorage) return
  watchingStorage = true
  try {
    globalThis.addEventListener?.('storage', (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return
      current = load()
      notify()
    })
  } catch {
    // No window (node): single-context, nothing to sync.
  }
}

/** Current preferences (stable reference until a value actually changes — uSES-safe). */
export function getMazeSettings(): MazeSettings {
  current ??= load()
  return current
}

/** Merge a patch; persist and notify only when a value actually changed. */
export function updateMazeSettings(patch: Partial<MazeSettings>): void {
  const prev = getMazeSettings()
  const next = { ...prev, ...patch }
  if (shallowEqual(prev, next)) return
  current = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (error) {
    // The flip still applies for this page's lifetime; say so instead of hiding it.
    console.warn('[dsh-maze] settings not persisted', error)
  }
  notify()
}

/** Subscribe to preference changes (this tab's writes and other tabs'); returns the unsubscriber. */
export function subscribeMazeSettings(listener: () => void): () => void {
  watchStorage()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
