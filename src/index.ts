/**
 * Host half: read-only endpoints behind the local session library (diagnosis item 7).
 *
 * Why a Host half at all: the browser half can list sessions and retain one, but a
 * retained cold session only yields the Host's first page of history (measured on a
 * 37 871-second, 120-step log: the snapshot came back as a 3 014-second window).
 * The complete log is only reachable in-process, where `sessionQuery` already reads
 * multi-frame `.jsonl.zstd` correctly — Node's own zstd decompressor silently
 * returns the first frame only, which is why the browser half must not read files
 * itself.
 *
 * Both routes are read-only, same-origin, and id-scoped: ids must come from the
 * Host's own session list, so there is no path input to traverse with.
 *
 * `inject: ['connection']` is the only required service — `connection` carries the
 * browser-reachable route registry. Optional services are looked up with
 * `Reflect.get` so a host without them answers 503 with a reason instead of failing
 * to load the plugin.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-maze'
/** `connection` is the only browser-reachable route channel; without it the row just waits. */
export const inject = ['connection']

/** List of sessions known to the Host (metadata only). */
export const SESSIONS_PATH = '/api/maze.sessions'
/** Complete raw log of one session, as newline-delimited JSON events. */
export const LOG_PATH = '/api/maze.log'
/** Model review of one deterministic analysis (diagnosis item 8). POST, JSON in/out. */
export const REVIEW_PATH = '/api/maze.review'

/** Refuse absurd logs rather than trying to serialize them into one response. */
const MAX_LOG_BYTES = 96 * 1024 * 1024
/** Prompts are built from one session's analysis; this bounds what a page can send. */
const MAX_PROMPT_CHARS = 200_000

/**
 * The reviewer's standing instruction. Deliberately narrow: the model gets the
 * deterministic numbers the page already computed and answers in prose — it never
 * produces numbers of its own that the UI would treat as data.
 */
const REVIEW_SYSTEM = [
  '你是 DSH（DeepSeek Harness）会话的审阅者。用户会给你一场（或两场）会话的确定性分析结果，',
  '包括摘要卡、结果与证据、行为信号、上下文构成，以及失败调用的原文摘录。',
  '请直接给出判断：这场跑得怎么样、问题出在哪、下一步具体改什么。',
  '不要复述数据，不要编造没有给出的数字；不确定就说不确定。',
  '回答用中文，控制在 300 字以内（对比打分的 JSON 除外）。',
].join('')

interface StreamChunkLike {
  type?: string
  text?: string
  usage?: unknown
  reason?: { kind?: string; failure?: { message?: string } }
}

interface LlmLike {
  stream?: (options: Record<string, unknown>) => AsyncIterable<StreamChunkLike>
}

interface ReviewRoute {
  provider: string
  model: string
}

interface MinimalRequest {
  url: string
  method?: string
}

interface RouteSpec {
  path: string
  methods: string[]
  requestBody: string
  fetch: (request: MinimalRequest) => Promise<Response>
}

interface ConnectionLike {
  fetch?: { register?: (spec: RouteSpec) => unknown }
}

/** One row of the Host's session corpus, as this plugin reports it. */
export interface MazeSessionRow {
  id: string
  cwd: string | null
  createdAt: number
  live: boolean
  persisted: boolean
  origin: string | null
  parent: string | null
}

interface SessionRecordLike {
  header: { id: string; cwd?: string; createdAt?: number; origin?: string; parentSession?: string }
  live?: boolean
  persisted?: boolean
}

interface SessionQueryLike {
  listSessions?: (signal?: AbortSignal) => Promise<SessionRecordLike[]>
  /** Complete logical log of one session; the Host's own reader handles multi-frame zstd. */
  readSession?: (id: string) => Promise<{ session?: unknown; events?: unknown[] }>
}

function connectionOf(ctx: Context): ConnectionLike | undefined {
  return Reflect.get(ctx, 'connection') as ConnectionLike | undefined
}

/**
 * Optional host services. `ctx.get(name)` is cordis's own lookup: it returns
 * undefined for a service this plugin did not inject, whereas plain property
 * access throws ("cannot get property X without inject").
 */
function serviceOf(ctx: Context, key: string): unknown {
  const get = (ctx as unknown as { get?: (name: string) => unknown }).get
  if (typeof get === 'function') {
    try {
      return get.call(ctx, key)
    } catch {
      return undefined
    }
  }
  try {
    return Reflect.get(ctx, key)
  } catch {
    return undefined
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Compact one corpus record into the shape the browser half lists. */
export function toRow(record: SessionRecordLike): MazeSessionRow {
  const h = record.header ?? ({} as SessionRecordLike['header'])
  return {
    id: String(h.id ?? ''),
    cwd: h.cwd ?? null,
    createdAt: Number(h.createdAt ?? 0),
    live: record.live === true,
    persisted: record.persisted === true,
    origin: h.origin ?? null,
    parent: h.parentSession ?? null,
  }
}

/** Newest first; subagent children are filtered out unless explicitly asked for. */
export function rowsOf(records: SessionRecordLike[], includeChildren = false): MazeSessionRow[] {
  return records
    .map(toRow)
    .filter((r) => r.id !== '' && (includeChildren || (r.origin == null && r.parent == null)))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * UTF-8 byte length without importing Node types: the plugin compiles against the
 * client type environment too. Falls back to a UTF-16 estimate where Buffer is absent.
 */
export function byteLength(text: string): number {
  const buf = (globalThis as { Buffer?: { byteLength(value: string): number } }).Buffer
  return buf === undefined ? text.length * 2 : buf.byteLength(text)
}

/** Serialize a logical log back to the on-disk JSONL shape the page's parser reads. */
export function logText(events: unknown[]): string {
  const lines: string[] = []
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    lines.push(JSON.stringify(event))
  }
  return lines.join('\n')
}

/**
 * Resolve the route for one review: the page's own numbers (the model that ran the
 * session) win, the host default is the fallback. Nothing is guessed: without either,
 * the route answers 409 so the UI can say "no model route" instead of failing late.
 */
export function resolveRoute(ctx: Context, body: { provider?: unknown; model?: unknown }): ReviewRoute | null {
  const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
  const model = typeof body.model === 'string' ? body.model.trim() : ''
  if (provider !== '' && model !== '') return { provider, model }
  const fallback = serviceOf(ctx, 'agentDefaultModel') as
    | { currentSelection?: () => { provider?: string; model?: string } | undefined }
    | undefined
  const selection = fallback?.currentSelection?.()
  if (selection?.provider !== undefined && selection?.model !== undefined && selection.provider !== '' && selection.model !== '') {
    return { provider: selection.provider, model: selection.model }
  }
  return null
}

/**
 * Read one assistant stream to completion: text deltas in, plus the terminal finish.
 * Rules copied from the host's own experimental-auto-review reviewer — data after the
 * finish is an error, a non-stop finish is an error, and empty text is an error, so a
 * truncated or failed call can never be shown as an opinion.
 */
export async function readStream(stream: AsyncIterable<StreamChunkLike>): Promise<{ text: string; usage: unknown }> {
  let text = ''
  let usage: unknown = null
  let finished = false
  for await (const chunk of stream) {
    if (finished) throw new Error('model emitted data after its terminal finish')
    if (chunk?.type === 'text-delta') text += String(chunk.text ?? '')
    else if (chunk?.type === 'usage') usage = chunk.usage ?? null
    else if (chunk?.type === 'finish') {
      finished = true
      const kind = chunk.reason?.kind
      if (kind === 'error' || kind === 'aborted') {
        throw new Error(`model ended with ${kind}: ${chunk.reason?.failure?.message ?? 'no message'}`)
      }
      if (kind !== 'stop') throw new Error(`model ended with ${String(kind)}`)
    }
  }
  if (!finished) throw new Error('model emitted no terminal finish')
  if (text.trim() === '') throw new Error('model returned no text')
  return { text, usage }
}

export function apply(ctx: Context): void {
  const connection = connectionOf(ctx)
  if (connection?.fetch?.register === undefined) return

  connection.fetch.register({
    path: SESSIONS_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request: MinimalRequest) => {
      const query = serviceOf(ctx, 'sessionQuery') as SessionQueryLike | undefined
      if (query?.listSessions === undefined) {
        return json({ error: 'session-query-unavailable', detail: 'this host has no session-query service' }, 503)
      }
      const url = new URL(request.url, 'http://localhost')
      const records = await query.listSessions()
      return json({ sessions: rowsOf(records, url.searchParams.get('children') === 'true') })
    },
  })

  connection.fetch.register({
    path: REVIEW_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request: MinimalRequest & { json?: () => Promise<unknown> }) => {
      const llm = serviceOf(ctx, 'llm') as LlmLike | undefined
      if (llm?.stream === undefined) {
        return json({ error: 'llm-unavailable', detail: 'this host exposes no llm service' }, 503)
      }
      let body: { prompt?: unknown; provider?: unknown; model?: unknown }
      try {
        body = (await request.json?.()) as typeof body
      } catch {
        return json({ error: 'bad-json' }, 400)
      }
      const prompt = typeof body?.prompt === 'string' ? body.prompt.slice(0, MAX_PROMPT_CHARS) : ''
      if (prompt === '') return json({ error: 'empty-prompt' }, 400)
      const route = resolveRoute(ctx, body ?? {})
      if (route === null) return json({ error: 'no-model-route' }, 409)
      try {
        const result = await readStream(llm.stream({
          provider: route.provider,
          model: route.model,
          system: REVIEW_SYSTEM,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
          temperature: 0,
        }))
        return json({ ok: true, provider: route.provider, model: route.model, text: result.text, usage: result.usage })
      } catch (error) {
        return json({ error: 'model-call-failed', detail: String(error) }, 502)
      }
    },
  })

  connection.fetch.register({
    path: LOG_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request: MinimalRequest) => {
      const query = serviceOf(ctx, 'sessionQuery') as SessionQueryLike | undefined
      if (query?.listSessions === undefined || query.readSession === undefined) {
        return json({ error: 'session-query-unavailable', detail: 'this host exposes no readSession' }, 503)
      }
      const id = new URL(request.url, 'http://localhost').searchParams.get('sessionId') ?? ''
      if (id === '') return json({ error: 'missing-sessionId' }, 400)
      // ID-scoped on purpose: only sessions the Host itself lists may be read.
      const records = await query.listSessions()
      if (!records.some((r) => String(r.header?.id ?? '') === id)) return json({ error: 'unknown-session' }, 404)
      const loaded = await query.readSession(id)
      const events = Array.isArray(loaded?.events) ? loaded.events : []
      const text = logText(events)
      const bytes = byteLength(text)
      if (bytes > MAX_LOG_BYTES) return json({ error: 'log-too-large', bytes, limit: MAX_LOG_BYTES }, 413)
      return new Response(text, {
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-store',
          'x-maze-events': String(events.length),
        },
      })
    },
  })
}
