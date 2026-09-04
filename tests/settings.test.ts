import { afterEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'dsh-maze:v1:settings'

/** Minimal localStorage double backed by a Map. */
function stubStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) },
  })
  return map
}

/** Capture the 'storage' listener the facade installs on the global. */
function stubStorageEvents() {
  const handlers: ((event: { key: string | null }) => void)[] = []
  vi.stubGlobal('addEventListener', (type: string, handler: (event: { key: string | null }) => void) => {
    if (type === 'storage') handlers.push(handler)
  })
  return handlers
}

/** Fresh module instance per test: the facade caches state at module level. */
async function loadFacade() {
  vi.resetModules()
  return import('../src/client/settings.ts')
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('maze settings facade', () => {
  it('defaults to sidebarEntry on when storage is empty', async () => {
    stubStorage()
    const { getMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(true)
  })

  it('reads a persisted false back', async () => {
    stubStorage({ [STORAGE_KEY]: JSON.stringify({ sidebarEntry: false }) })
    const { getMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(false)
  })

  it.each([
    ['corrupted JSON', '{not json'],
    ['a string payload', '"just a string"'],
    ['an array payload', '[false]'],
    ['a string "false"', JSON.stringify({ sidebarEntry: 'false' })],
    ['a null field', JSON.stringify({ sidebarEntry: null })],
  ])('falls back to the default on %s', async (_label, stored) => {
    stubStorage({ [STORAGE_KEY]: stored })
    const { getMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(true)
  })

  it('keeps unknown keys from a newer build across a write', async () => {
    const map = stubStorage({ [STORAGE_KEY]: JSON.stringify({ sidebarEntry: true, defaultView: 'live' }) })
    const { updateMazeSettings } = await loadFacade()
    updateMazeSettings({ sidebarEntry: false })
    expect(JSON.parse(map.get(STORAGE_KEY) ?? '{}')).toEqual({ sidebarEntry: false, defaultView: 'live' })
  })

  it('update persists, notifies, and keeps a stable snapshot between updates', async () => {
    const map = stubStorage()
    const { getMazeSettings, subscribeMazeSettings, updateMazeSettings } = await loadFacade()
    const before = getMazeSettings()
    expect(getMazeSettings()).toBe(before)
    const seen: boolean[] = []
    const unsubscribe = subscribeMazeSettings(() => { seen.push(getMazeSettings().sidebarEntry) })
    updateMazeSettings({ sidebarEntry: false })
    expect(seen).toEqual([false])
    expect(JSON.parse(map.get(STORAGE_KEY) ?? '{}')).toEqual({ sidebarEntry: false })
    unsubscribe()
    updateMazeSettings({ sidebarEntry: true })
    expect(seen).toEqual([false])
  })

  it('a value-level no-op update neither writes nor notifies nor changes the reference', async () => {
    const map = stubStorage()
    const { getMazeSettings, subscribeMazeSettings, updateMazeSettings } = await loadFacade()
    const before = getMazeSettings()
    let calls = 0
    subscribeMazeSettings(() => { calls += 1 })
    updateMazeSettings({ sidebarEntry: true })
    expect(calls).toBe(0)
    expect(map.has(STORAGE_KEY)).toBe(false)
    expect(getMazeSettings()).toBe(before)
  })

  it('one throwing listener does not starve the others', async () => {
    stubStorage()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { subscribeMazeSettings, updateMazeSettings } = await loadFacade()
    let secondRan = false
    subscribeMazeSettings(() => { throw new Error('boom') })
    subscribeMazeSettings(() => { secondRan = true })
    expect(() => updateMazeSettings({ sidebarEntry: false })).not.toThrow()
    expect(secondRan).toBe(true)
  })

  it('runs on defaults and still flips in-memory when storage methods throw', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    const { getMazeSettings, updateMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(true)
    updateMazeSettings({ sidebarEntry: false })
    expect(getMazeSettings().sidebarEntry).toBe(false)
  })

  it('runs on defaults when the localStorage property access itself throws', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError') },
    })
    try {
      const { getMazeSettings } = await loadFacade()
      expect(getMazeSettings().sidebarEntry).toBe(true)
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })

  it("another tab's write refreshes the cache and notifies", async () => {
    const map = stubStorage()
    const handlers = stubStorageEvents()
    const { getMazeSettings, subscribeMazeSettings } = await loadFacade()
    const seen: boolean[] = []
    subscribeMazeSettings(() => { seen.push(getMazeSettings().sidebarEntry) })
    expect(getMazeSettings().sidebarEntry).toBe(true)
    map.set(STORAGE_KEY, JSON.stringify({ sidebarEntry: false }))
    for (const handler of handlers) handler({ key: STORAGE_KEY })
    expect(getMazeSettings().sidebarEntry).toBe(false)
    expect(seen).toEqual([false])
    for (const handler of handlers) handler({ key: 'unrelated' })
    expect(seen).toEqual([false])
  })
})
