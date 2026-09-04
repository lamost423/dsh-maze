import { afterEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'dsh-maze:v1:settings'

/** Minimal localStorage double backed by a Map. */
function stubStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) },
    removeItem: (key: string) => { map.delete(key) },
  })
  return map
}

/** Fresh module instance per test: the facade caches state at module level. */
async function loadFacade() {
  vi.resetModules()
  return import('../src/client/settings.ts')
}

afterEach(() => { vi.unstubAllGlobals() })

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

  it('falls back to defaults on corrupted JSON', async () => {
    stubStorage({ [STORAGE_KEY]: '{not json' })
    const { getMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(true)
  })

  it('falls back to defaults on a non-object payload', async () => {
    stubStorage({ [STORAGE_KEY]: '"just a string"' })
    const { getMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(true)
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

  it('runs on defaults and still flips in-memory when storage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    })
    const { getMazeSettings, updateMazeSettings } = await loadFacade()
    expect(getMazeSettings().sidebarEntry).toBe(true)
    updateMazeSettings({ sidebarEntry: false })
    expect(getMazeSettings().sidebarEntry).toBe(false)
  })
})
