/**
 * 宿主半（诊断层第 7 项的只读端点）的纯函数测试：会话列表压缩、子会话过滤与排序、
 * 逻辑日志回写成 JSONL、字节长度估算。
 */
import { describe, expect, it } from 'vitest'
import { LOG_PATH, SESSIONS_PATH, byteLength, logText, rowsOf, toRow } from '../src/index.ts'

const rec = (id: string, createdAt: number, extra: Record<string, unknown> = {}) => ({
  header: { id, createdAt, cwd: '/w', ...(extra.header as object | undefined) },
  live: extra.live === true,
  persisted: extra.persisted !== false,
  ...(extra.origin === undefined ? {} : { headerOrigin: extra.origin }),
})

describe('host routes: 会话列表', () => {
  it('新到旧排序，字段压缩成浏览器要的形状', () => {
    const rows = rowsOf([
      { header: { id: 'a', createdAt: 100, cwd: '/one' }, live: true, persisted: true },
      { header: { id: 'b', createdAt: 300, cwd: '/two' }, persisted: true },
      { header: { id: 'c', createdAt: 200 }, persisted: false },
    ])
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect(rows[2]).toEqual({ id: 'a', cwd: '/one', createdAt: 100, live: true, persisted: true, origin: null, parent: null })
    expect(rows[2]?.live).toBe(true)
  })

  it('默认只列顶层会话；子代理（有 origin 或 parent）默认过滤掉', () => {
    const records = [
      { header: { id: 'top', createdAt: 1 } },
      { header: { id: 'child1', createdAt: 2, origin: 'subagent' } },
      { header: { id: 'child2', createdAt: 3, parentSession: 'top' } },
    ]
    expect(rowsOf(records).map((r) => r.id)).toEqual(['top'])
    expect(rowsOf(records, true).map((r) => r.id)).toEqual(['child2', 'child1', 'top'])
  })

  it('缺字段的记录不炸：id 为空的行被丢掉', () => {
    const rows = rowsOf([{ header: {} as never }, { header: { id: 'ok', createdAt: 5 } }])
    expect(rows.map((r) => r.id)).toEqual(['ok'])
    expect(toRow({ header: { id: 'x' } }).createdAt).toBe(0)
    expect(toRow({ header: { id: 'x' } }).cwd).toBeNull()
  })

  it('端点路径是公开常量（客户端半按它取数）', () => {
    expect(SESSIONS_PATH).toBe('/api/maze.sessions')
    expect(LOG_PATH).toBe('/api/maze.log')
  })
})

describe('host routes: 日志回写与字节长度', () => {
  it('逻辑日志回写成解析器读的 NDJSON：一行一个事件、跳过非对象', () => {
    const text = logText([{ type: 'session', seq: 1, time: 5, data: { id: 'x' } }, null, 7, { type: 'turn/start', seq: 2, time: 6, data: {} }])
    const lines = text.split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]!).type).toBe('session')
    expect(JSON.parse(lines[1]!).type).toBe('turn/start')
    expect(text.includes('\n\n')).toBe(false)
  })

  it('空日志回写成空串', () => {
    expect(logText([])).toBe('')
  })

  it('字节长度：UTF-8 而不是 UTF-16 估计（Node 下走 Buffer）', () => {
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('中文')).toBe(6)   // 每个汉字 3 字节
  })
})
