/**
 * Test fixture builder for the host 0.1.2 Chat target snapshot.
 *
 * Tests keep describing a conversation as the flat event list they always
 * used — it stays the readable form. This module compiles that list into the
 * shape the converter now consumes: an ordered key list over a keyed node
 * store, with turn boundaries on the timeline instead of counted from user
 * messages, and each tool call settled inside one node instead of paired
 * across two events.
 */
import type {
  AssistantChatData, AssistantMessageNode, ChatConversationViewNode, ChatNode, ChatSnapshot,
  ModelRetryNode, ToolResultNode, TurnErrorNode,
} from '@deepseek-ai/dsh-client-ui-chat/client'

/** The payload type upstream declares for one registered Chat node kind. */
type DataOf<K extends ChatNode['kind']> = Extract<ChatNode, { kind: K }>['data']

/** One logical conversation event, in the flat form the tests author. */
export interface FixtureEvent {
  kind: 'user' | 'assistant' | 'tool-result' | 'model-retry' | 'turn-error' | 'partial'
  seq?: number
  time?: number
  timing?: { stepStartTime?: number }
  requestConfig?: { model?: string }
  usage?: unknown
  blocks?: readonly { kind: string; text?: string; name?: string; callId?: string; argsRaw?: string }[]
  callId?: string
  isError?: boolean
  content?: readonly { type?: string; text?: string }[]
  /** model-retry / turn-error payload fields, passed through verbatim. */
  [extra: string]: unknown
}

/** A turn boundary carrying only the fields the converter reads. */
function turnLocation(turn: number, startTime: number): unknown {
  return {
    turn,
    start: { type: 'turn/start', seq: turn, time: startTime, data: {} },
    end: undefined,
    status: 'open',
    steps: [],
    data: { get: () => undefined },
  }
}

/**
 * Compile a flat event list into a Chat target snapshot.
 * @param events - conversation events in wall-clock order.
 * @returns the snapshot the live converter consumes.
 */
export function chatSnapshot(events: readonly FixtureEvent[]): ChatSnapshot {
  const order: string[] = []
  const byKey = new Map<string, ChatConversationViewNode>()
  const turnOrder: number[] = []
  const turns = new Map<number, unknown>()
  let turn = 0
  let step = 0

  // Payloads are checked against the kinds upstream actually registers, so a
  // fixture that drifts from the host contract fails to compile rather than
  // quietly validating the converter against a shape the host never emits.
  const push = <K extends ChatNode['kind']>(kind: K, data: DataOf<K>, anchorSeq: number): void => {
    const key = `k${String(order.length)}`
    order.push(key)
    byKey.set(key, {
      key, id: key, kind, target: 'chat', anchorSeq, visibility: 'visible',
      location: turn === 0
        ? { kind: 'session' }
        : { kind: 'step', turn: turns.get(turn), step: { turn, step, status: 'closed' } },
      data,
    } as unknown as ChatConversationViewNode)
  }

  for (const e of events) {
    if (e.kind === 'user') {
      turn += 1
      step = 0
      turnOrder.push(turn)
      turns.set(turn, turnLocation(turn, e.time ?? 0))
      continue
    }
    if (e.kind === 'assistant' || e.kind === 'partial') {
      const running = e.kind === 'partial'
      if (!running) step += 1
      const blocks = (e.blocks ?? []) as AssistantChatData['blocks']
      push('assistant-step', {
        status: running ? 'running' : 'settled',
        turn: Math.max(turn, 1),
        step,
        blocks,
        time: e.time ?? 0,
        usage: e.usage,
        ...(running ? {} : {
          finalNode: {
            kind: 'assistant', seq: e.seq ?? 0, time: e.time ?? 0,
            turn: Math.max(turn, 1), step, blocks, usage: e.usage,
            ...(e.requestConfig === undefined ? {} : { requestConfig: e.requestConfig }),
            ...(e.timing === undefined ? {} : {
              timing: { stepStartTime: null, firstTokenTime: null, completedTime: e.time ?? 0, ...e.timing },
            }),
          } as AssistantMessageNode,
        }),
      }, e.seq ?? 0)
      continue
    }
    if (e.kind === 'tool-result') {
      // One settled Tool root now carries call and result together.
      push('tool-call', {
        root: {
          kind: 'tool-result', seq: e.seq ?? 0, time: e.time ?? 0,
          callId: e.callId ?? '', call: null, callTime: null,
          content: (e.content ?? []) as ToolResultNode['content'],
          isError: e.isError ?? false, subCalls: [],
        },
      }, e.seq ?? 0)
      continue
    }
    if (e.kind === 'model-retry') {
      // ui-chat folds one retry chain into a single node; a fixture event is
      // one attempt, so each becomes its own single-attempt chain.
      const attempt = { ...e, kind: 'model-retry' } as unknown as ModelRetryNode
      push('model-retry', { attempts: [attempt], current: attempt }, e.seq ?? 0)
      continue
    }
    if (e.kind === 'turn-error') {
      push('turn-error', { ...e, kind: 'turn-error' } as unknown as TurnErrorNode, e.seq ?? 0)
    }
  }

  return {
    order,
    nodes: {
      get: (key: string) => byKey.get(key),
      values: () => [...byKey.values()],
    },
    locations: { getTurn: () => [], getStep: () => [] },
    navigation: { items: () => [] },
    timeline: { turnOrder, turns: turns as never },
    legacy: {
      nodes: [], turnTimings: new Map(), turnEnds: new Map(),
      partial: null, runningCalls: [],
    },
  } as unknown as ChatSnapshot
}
