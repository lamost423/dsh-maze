/** 诊断层第 1 项：结果与证据——验证命令识别、退出码读取、产物路径、六格聚合与综合判定。 */
import { describe, expect, it } from 'vitest'
import {
  ANALYSIS_RULES, artifactPaths, commandOf, detectValidationKinds, exitCodeOf, outcomeEvidence, validationHits, validationPassed,
} from '../src/client/verdict.js'

/* ---- 合成泳道：一行一个事件，时间单调递增 ----
 *   ['bash', cmd, { exit?, err?, res? }]  shell 调用（自成一步）
 *   ['write' | 'edit' | 'apply_patch', args, { err? }]
 *   ['run_code', script]
 *   ['answer']                             无工具的回答步
 *   ['end', kind]                          turn/end
 *   ['user']                               真人消息（开新一轮）
 *   ['live']                               实时链路的在途步
 */
type Ev = [string, ...unknown[]]
interface Tool { name: string; args: string; s: number; e: number; v: string; err: boolean; exit: number | null; res: string; resFull?: string }
interface Node { step: number; turn: number; s: number; e: number; v: string; tools: Tool[]; live?: boolean; sub?: true; evt?: string }

function synth(events: readonly Ev[]){
  const main: Node[] = [], detours: Node[] = []
  const turnEnds: { turn: number; kind: string; s: number }[] = []
  const userMsgs: { s: number }[] = []
  let t = 0, turn = 1, step = 0
  const push = (n: Node) => { (n.v === 'ok' || n.v === 'answer' ? main : detours).push(n) }
  for (const [kind, a, b] of events){
    t += 10
    const opts = (b ?? {}) as { exit?: number | null; err?: boolean; res?: string; v?: string }
    if (kind === 'user'){ if (step > 0 || turnEnds.length > 0) turn += 1; step = 0; userMsgs.push({ s: t }); continue }
    if (kind === 'end'){ turnEnds.push({ turn, kind: String(a), s: t }); continue }
    step += 1
    if (kind === 'answer'){ push({ step, turn, s: t, e: t + 1, v: 'answer', tools: [] }); continue }
    if (kind === 'live'){ main.push({ step, turn, s: t, e: t + 1, v: 'ok', tools: [], live: true }); continue }
    const err = opts.err ?? false
    const res = opts.res ?? ''
    const exit = opts.exit !== undefined ? opts.exit : exitCodeOf(res)
    const v = opts.v ?? (err ? 'error' : 'ok')
    const tool: Tool = { name: kind, args: String(a), s: t, e: t + 2, v, err, exit, res: res.slice(0, 380), resFull: res.slice(0, 5000) }
    push({ step, turn, s: t, e: t + 3, v, tools: [tool] })
  }
  return { main, detours, turnEnds, userMsgs }
}

/** 一场跑到底的典型会话：用户提问 → 若干步 → 回答 → turn/end completed。 */
const finished = (middle: readonly Ev[]): Ev[] => [['user'], ...middle, ['answer'], ['end', 'completed']]

describe('detectValidationKinds（命令位置识别，一条命令命中多类分别记）', () => {
  it('recognizes package-manager scripts, direct runners, and language toolchains', () => {
    expect(detectValidationKinds('pnpm test')).toEqual(['test'])
    expect(detectValidationKinds('npm run test:unit -- --watch=false')).toEqual(['test'])
    expect(detectValidationKinds('npx vitest run tests/')).toEqual(['test'])
    expect(detectValidationKinds('pnpm exec tsc --noEmit')).toEqual(['build'])
    expect(detectValidationKinds('yarn -s lint')).toEqual(['lint'])
    expect(detectValidationKinds('CI=true pytest -q tests')).toEqual(['test'])
    expect(detectValidationKinds('python3 -m pytest tests/')).toEqual(['test'])
    expect(detectValidationKinds('uv run pytest')).toEqual(['test'])
    expect(detectValidationKinds('ruff check . && ruff format --check .')).toEqual(['lint'])
    expect(detectValidationKinds('cargo test --workspace')).toEqual(['test'])
    expect(detectValidationKinds('cargo clippy -- -D warnings')).toEqual(['lint'])
    expect(detectValidationKinds('go build ./... && go vet ./...')).toEqual(['build', 'lint'])
    expect(detectValidationKinds('swift build -c release')).toEqual(['build'])
    expect(detectValidationKinds('xcodebuild -scheme App test')).toEqual(['test'])
    expect(detectValidationKinds('xcodebuild -scheme App -configuration Debug')).toEqual(['build'])
    expect(detectValidationKinds('sh deploy/hk-uat/check-release-contract_test.sh')).toEqual(['test'])
    expect(detectValidationKinds('timeout 60 pnpm vitest run')).toEqual(['test'])
    expect(detectValidationKinds('if pytest; then echo ok; fi')).toEqual(['test'])
  })

  it('one command hitting several kinds records each of them, in fixed order', () => {
    expect(detectValidationKinds('cd /x && pnpm lint && pnpm test && pnpm build')).toEqual(['test', 'build', 'lint'])
    expect(detectValidationKinds('pnpm build\npnpm test')).toEqual(['test', 'build'])
  })

  it('ignores tool names that are not in command position (file names, grep targets, quoted text, heredoc bodies)', () => {
    expect(detectValidationKinds('cat vitest.config.ts')).toEqual([])
    expect(detectValidationKinds('grep -n pytest pyproject.toml')).toEqual([])
    expect(detectValidationKinds('wc -l build-all.sh')).toEqual([])
    expect(detectValidationKinds('echo "npm test"')).toEqual([])
    expect(detectValidationKinds('git commit -m "run pnpm test"')).toEqual([])
    expect(detectValidationKinds("python3 -B - <<'PY'\nimport pytest\nPY")).toEqual([])
    expect(detectValidationKinds('make clean')).toEqual([])
    expect(detectValidationKinds('')).toEqual([])
    expect(detectValidationKinds(null)).toEqual([])
  })

  it('blanks heredoc bodies and quoted strings before segmenting (real-log false positives, 2026-09-06)', () => {
    // 编辑测试文件的 python heredoc：正文里有 shell 行和 `…|docker build|…` 正则串
    expect(detectValidationKinds("cd /r && python3 -B - <<'PY'\np = 'deploy/x_test.sh'\ns = s.replace('sh deploy/x_test.sh', 'y')\nDEPLOY = re.compile(r'deploy|docker build|make')\nPY")).toEqual([])
    expect(detectValidationKinds("cat > /tmp/a.py <<'PY'\nnpm test\nPY\n")).toEqual([])
    // 多行提交信息里提到测试脚本
    expect(detectValidationKinds('git add -A && git commit -qm "fix: gate\n\n- run sh deploy/x_test.sh before release"')).toEqual([])
    // heredoc 之后的真命令仍然认
    expect(detectValidationKinds("python3 - <<'PY'\nprint(1)\nPY\npnpm test")).toEqual(['test'])
    // `-c` 后面的引号串是要执行的脚本，保留：Codex 的数组形式命令拼出来就是这样
    expect(detectValidationKinds('bash -lc "go test ./..."')).toEqual(['test'])
    expect(detectValidationKinds('bash -lc go test ./...')).toEqual(['test'])
    expect(detectValidationKinds('sh -c \'cargo clippy\'')).toEqual(['lint'])
  })

  it('does not count `sh -n x_test.sh` (syntax check only) as running the test', () => {
    expect(detectValidationKinds('sh -n deploy/x_test.sh')).toEqual([])
    expect(detectValidationKinds('sh -n deploy/x_test.sh && sh deploy/x_test.sh')).toEqual(['test'])
    expect(detectValidationKinds('sh -x deploy/x_test.sh 2>&1 | grep -A6 assume')).toEqual(['test'])
  })

  it('cannot see through shell variables or project-specific wrappers (honest limit)', () => {
    expect(detectValidationKinds('for t in a_test.sh b_test.sh; do sh $t; done')).toEqual([])
    expect(detectValidationKinds('deploy/release/clean-python.sh deploy/hk-uat/test_hksql.py')).toEqual([])
  })
})

describe('exitCodeOf（只认末行）', () => {
  it('reads the dsh bash marker and the background-job marker from the last line', () => {
    expect(exitCodeOf('FAIL tests/a.py\n[exit code: 1]')).toBe(1)
    expect(exitCodeOf('FAIL tests/a.py\n[exit code: 1]\n')).toBe(1)
    expect(exitCodeOf('indexed 852\n[status: completed, exit code: 0]')).toBe(0)
    expect(exitCodeOf('error\n[status: completed, exit code: 2]')).toBe(2)
  })

  it('ignores an "exit code" quoted above the last line, and reports null without a marker', () => {
    // 2026-09-06 真实日志：docker 构建输出被 head 出来，末行是 "[status=Failed]"，命令本身退出 0
    expect(exitCodeOf('... did not complete successfully: exit code: 1\n     | [status=Failed]\n')).toBeNull()
    expect(exitCodeOf('all good')).toBeNull()
    expect(exitCodeOf('')).toBeNull()
    expect(exitCodeOf(null)).toBeNull()
  })

  it('still finds the marker in whitespace-collapsed text (older payloads without tl.exit)', () => {
    expect(exitCodeOf('line one line two [exit code: 3]')).toBe(3)
    expect(validationPassed({ err: false, resFull: 'x y [exit code: 1]' })).toBe(false)
    expect(validationPassed({ err: false, res: 'x y' })).toBe(true)
  })
})

describe('validationPassed', () => {
  it('fails on the error flag or a non-zero exit code; passes on zero or no marker', () => {
    expect(validationPassed({ err: true, exit: null })).toBe(false)
    expect(validationPassed({ err: false, exit: 1 })).toBe(false)
    expect(validationPassed({ err: false, exit: 101 })).toBe(false)
    expect(validationPassed({ err: false, exit: 0 })).toBe(true)
    expect(validationPassed({ err: false, exit: null })).toBe(true)
  })
})

describe('commandOf / artifactPaths（两条链路的参数形态都收）', () => {
  it('takes the summary string (upload) and the raw JSON (live), plus Codex array commands', () => {
    expect(commandOf('pnpm test')).toBe('pnpm test')
    expect(commandOf('{"command":"pnpm test","description":"run"}')).toBe('pnpm test')
    expect(commandOf('{"command":["bash","-lc","go test ./..."]}')).toBe('bash -lc go test ./...')
    expect(commandOf('{"file_path":"/x"}')).toBeNull()
  })

  it('reads file paths from summary strings, JSON arguments, and apply_patch headers', () => {
    expect(artifactPaths('write', '/a/b.ts')).toEqual(['/a/b.ts'])
    expect(artifactPaths('edit', '{"file_path":"/x.py","old_string":"a","new_string":"b"}')).toEqual(['/x.py'])
    expect(artifactPaths('apply_patch', '{"patch":"*** Begin Patch\\n*** Update File: src/a.ts\\n*** Add File: docs/b.md\\n*** End Patch"}')).toEqual(['src/a.ts', 'docs/b.md'])
    expect(artifactPaths('write', '')).toEqual([])
    expect(artifactPaths('write', '{"content":"no path"}')).toEqual([])
  })
})

describe('outcomeEvidence（六格 + 综合）', () => {
  it('测试先失败后通过：同一条命令取最后一次 → 测试通过、综合已完成', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'pnpm test', { res: 'FAIL 1 test\n[exit code: 1]' }],
      ['edit', '/repo/src/a.ts'],
      ['bash', 'pnpm test', { res: 'Tests 12 passed' }],
    ])))
    expect(oc.test).toMatchObject({ runs: 2, commands: 1, failedCommands: 0, passed: true, anchorCmd: 'pnpm test', anchorExit: null })
    expect(oc.test.anchor!.tl.s).toBeGreaterThan(oc.test.anchor!.n.s - 1)   // anchor = 最后一次运行
    expect(oc.task.state).toBe('done')
    expect(oc.artifacts.paths).toEqual(['/repo/src/a.ts'])
    expect(oc.overall).toBe('done')
    expect(oc.missing).toEqual(['build', 'lint'])
  })

  it('只构建没测试：构建通过、测试格为「没跑」、综合已完成但标出缺项', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'pnpm build', { res: 'built in 1.2s' }],
    ])))
    expect(oc.build).toMatchObject({ runs: 1, passed: true })
    expect(oc.test).toMatchObject({ runs: 0, passed: null, anchor: null })
    expect(oc.anyValidation).toBe(true)
    expect(oc.overall).toBe('done')
    expect(oc.missing).toEqual(['test', 'lint'])
  })

  it('没有任何验证：综合「未验证」而不是失败', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'ls -la'],
      ['bash', 'cat vitest.config.ts'],
      ['write', '/repo/README.md'],
    ])))
    expect(oc.anyValidation).toBe(false)
    expect(oc.overall).toBe('unverified')
    expect(oc.missing).toEqual(['test', 'build', 'lint'])
    expect(oc.task.state).toBe('done')
  })

  it('一条命令命中多类：lint && test && build 一次失败 → 三格都记失败', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'pnpm lint && pnpm test && pnpm build', { res: 'x\n[exit code: 1]' }],
    ])))
    for (const k of ['test', 'build', 'lint'] as const) expect(oc[k]).toMatchObject({ runs: 1, commands: 1, failedCommands: 1, passed: false, anchorExit: 1 })
    expect(oc.failedKinds).toEqual(['test', 'build', 'lint'])
    expect(oc.overall).toBe('partial')
  })

  it('非零退出码：isError 为假但末行退出码非零 → 失败；引用在正文里的退出码不算', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'pytest tests/', { res: '3 failed\n[exit code: 1]' }],
      ['bash', 'pnpm build', { res: 'saw "exit code: 1" in a log\n[status=Failed]' }],
    ])))
    expect(oc.test).toMatchObject({ passed: false, anchorExit: 1 })
    expect(oc.build).toMatchObject({ passed: true, anchorExit: null })
    expect(oc.overall).toBe('partial')
  })

  it('不同命令各取最后一次：一条最后失败、另一条最后通过 → 类别失败，锚点指向最后失败的那条', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'pytest tests/a.py', { res: '[exit code: 1]' }],
      ['bash', 'pytest tests/b.py', { res: 'ok' }],
      ['bash', 'pytest tests/b.py', { res: 'ok' }],
    ])))
    expect(oc.test).toMatchObject({ runs: 3, commands: 2, failedCommands: 1, passed: false, anchorCmd: 'pytest tests/a.py' })
  })

  it('「同一条命令」按命中的那段算，不按整行 bash：cd 前缀、重定向、echo 装饰不同的同一个测试是一条命令（big2 真实日志的情形）', () => {
    const oc = outcomeEvidence(synth(finished([
      ['bash', 'cd /repo && sh deploy/x_test.sh', { res: 'FAIL\n[exit code: 1]' }],
      ['edit', '/repo/deploy/x.sh'],
      ['bash', 'echo "=== all ==="; sh deploy/x_test.sh >/dev/null 2>&1 && echo "x: PASS" || echo "x: FAIL"', { res: 'x: PASS' }],
    ])))
    expect(oc.test).toMatchObject({ runs: 2, commands: 1, failedCommands: 0, passed: true, anchorCmd: 'sh deploy/x_test.sh' })
    expect(oc.overall).toBe('done')
    // 同一行里同一个测试跑两次只算一条命令；不同测试文件是两条
    expect(validationHits('sh a_test.sh 2>&1 | tail -3; sh a_test.sh; sh b_test.sh')).toEqual({ test: ['sh a_test.sh', 'sh b_test.sh'], build: [], lint: [] })
  })

  it('任务未正常结束：最后一轮 aborted / error / interrupted / blocked → 即使验证通过也只是部分成功', () => {
    for (const kind of ANALYSIS_RULES.TURN_END_INCOMPLETE){
      const oc = outcomeEvidence(synth([['user'], ['bash', 'pnpm test'], ['end', kind]]))
      expect(oc.task).toMatchObject({ state: 'failed', reason: kind, turn: 1 })
      expect(oc.overall).toBe('partial')
    }
  })

  it('多轮里前面都正常、最后一轮被打断 → 看最后一轮', () => {
    const oc = outcomeEvidence(synth([
      ['user'], ['bash', 'pnpm test'], ['answer'], ['end', 'completed'],
      ['user'], ['bash', 'pnpm build'], ['end', 'aborted'],
    ]))
    expect(oc.task).toMatchObject({ state: 'failed', reason: 'aborted', turn: 2 })
    expect(oc.human.responded).toBeNull()   // 最后一轮没有最终回答，无从谈回应
  })

  it('max-tokens 收尾仍算结束（原因写明）；结束但最后一步不是回答 → noAnswer', () => {
    const cut = outcomeEvidence(synth([['user'], ['bash', 'pnpm test'], ['answer'], ['end', 'max-tokens']]))
    expect(cut.task).toMatchObject({ state: 'done', reason: 'max-tokens' })
    const noAns = outcomeEvidence(synth([['user'], ['bash', 'pnpm test'], ['end', 'completed']]))
    expect(noAns.task.state).toBe('noAnswer')
    expect(noAns.overall).toBe('partial')
  })

  it('最后一轮没有结束事件 → unfinished；实时链路有在途步 → running', () => {
    expect(outcomeEvidence(synth([['user'], ['bash', 'pnpm test'], ['answer']])).task.state).toBe('unfinished')
    expect(outcomeEvidence(synth([['user'], ['bash', 'pnpm test'], ['live']])).task.state).toBe('running')
  })

  it('空会话不抛错：一切为零、任务 unfinished、综合部分成功', () => {
    const oc = outcomeEvidence({ main: [], detours: [] })
    expect(oc.task).toMatchObject({ state: 'unfinished', turn: null, reason: null, answer: null })
    expect(oc.test.runs + oc.build.runs + oc.lint.runs).toBe(0)
    expect(oc.artifacts.paths).toEqual([])
    expect(oc.human.responded).toBeNull()
    expect(oc.overall).toBe('partial')
  })

  it('产物：写入/编辑成功的路径去重，失败的写入单独计数，补丁展开多文件', () => {
    const oc = outcomeEvidence(synth(finished([
      ['write', '/r/a.ts'],
      ['edit', '/r/a.ts'],
      ['write', '/r/b.ts', { err: true }],
      ['apply_patch', '{"patch":"*** Begin Patch\\n*** Update File: /r/c.ts\\n*** Add File: /r/d.md\\n*** End Patch"}'],
    ])))
    expect(oc.artifacts).toEqual({ paths: ['/r/a.ts', '/r/c.ts', '/r/d.md'], writes: 3, failedWrites: 1 })
  })

  it('人工确认：最终回答之后有真人消息 → 已回应；没有 → 未回应；坐标折叠时用 wall 还原', () => {
    const none = outcomeEvidence(synth(finished([['bash', 'pnpm test']])))
    expect(none.human.responded).toBe(false)
    const lane = synth([...finished([['bash', 'pnpm test']]), ['user']])
    expect(outcomeEvidence(lane).human.responded).toBe(true)
    // 折叠坐标：节点时间被压成 1/10，userMsgs 仍是墙钟——不传 wall 会误判为「回答之后」
    const folded = { ...lane, main: lane.main.map(n => ({ ...n, s: n.s / 10, e: n.e / 10 })) }
    const late = { ...folded, userMsgs: [{ s: 5 }] }   // 墙钟 5s：在回答（墙钟 ≥ 40s）之前
    expect(outcomeEvidence(late, t => t * 10).human.responded).toBe(false)
    expect(outcomeEvidence(late).human.responded).toBe(true)   // 不还原就会错——这就是要传 wall 的原因
  })

  it('code 模式：run_code 只计数，不当 shell 命令识别；块里据此提示「内部派发暂不识别」', () => {
    const oc = outcomeEvidence(synth(finished([
      ['run_code', 'await bash({ command: "pnpm test" })'],
      ['run_code', 'await bash({ command: "pnpm build" })'],
    ])))
    expect(oc.codeCalls).toBe(2)
    expect(oc.anyValidation).toBe(false)
    expect(oc.overall).toBe('unverified')
  })

  it('在途调用、子代理聚合节点与请求级失败标记不进统计', () => {
    const lane = synth(finished([['bash', 'pnpm test']]))
    const oc = outcomeEvidence({
      ...lane,
      detours: [
        ...lane.detours,
        { step: 90, turn: 1, s: 1, e: 2, v: 'ok', sub: true, tools: [{ name: 'bash', args: 'pnpm build', s: 1, e: 2, v: 'ok', err: false, exit: 1, res: '' }] },
        { step: 91, turn: 1, s: 3, e: 3, v: 'error', evt: 'retry', tools: [] },
        { step: 92, turn: 1, s: 4, e: 5, v: 'ok', tools: [{ name: 'bash', args: 'pnpm lint', s: 4, e: null, v: 'ok', err: false, exit: null, res: '' }] },
      ],
    })
    expect(oc.build.runs).toBe(0)
    expect(oc.lint.runs).toBe(0)
    expect(oc.test.runs).toBe(1)
  })
})
