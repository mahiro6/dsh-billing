/** dsh-billing 纯模块验证:定价数学、配置校验、账本聚合与持久化、余额端点白名单、投影折叠、llm/stream 计费包裹、Typert 清单、真实 cordis 加载。 */
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

process.env.DSH_HOME = join(tmpdir(), 'dsh-billing-test-home')
rmSync(process.env.DSH_HOME, { recursive: true, force: true })
mkdirSync(process.env.DSH_HOME, { recursive: true })

let failures = 0
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`[ok] ${name}${detail ? ` (${detail})` : ''}`)
  } else {
    failures += 1
    console.error(`[FAIL] ${name}${detail ? ` (${detail})` : ''}`)
  }
}

// 1) 定价:计费数学 + 峰谷档位。
const {
  DEFAULT_PEAK_EFFECTIVE_AT,
  DEFAULT_PEAK_WINDOWS,
  DEFAULT_PRICE_TABLE,
  costOf,
  isPeakHour,
  normalizePrice,
  parsePricingHtml,
  priceEntryFor,
  tierFor,
} = await import('../lib/pricing.js')

const flash = DEFAULT_PRICE_TABLE.models['deepseek-v4-flash']
const baseCost = costOf({ input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000, cacheWrite: 0 }, flash, Date.parse('2026-01-01T00:00:00Z'), { enabled: false })
check('基础价成本 = 未命中+输出+命中 ($0.4228)', Math.abs(baseCost - 0.4228) < 1e-9, `got ${baseCost}`)

const peak = { enabled: true, effectiveAtMs: Date.parse(DEFAULT_PEAK_EFFECTIVE_AT), windows: DEFAULT_PEAK_WINDOWS }
const tPeak = tierFor(flash, Date.parse('2026-08-20T02:00:00Z'), peak)
const tOff = tierFor(flash, Date.parse('2026-08-20T11:00:00Z'), peak)
const tBase = tierFor(flash, Date.parse('2026-01-01T02:00:00Z'), peak)
check('峰时段取峰价', tPeak.cacheMiss === flash.peak.cacheMiss, `miss=${tPeak.cacheMiss}`)
check('谷时段取谷价', tOff.cacheMiss === flash.offPeak.cacheMiss, `miss=${tOff.cacheMiss}`)
check('生效前取基础价', tBase.cacheMiss === flash.cacheMiss, `miss=${tBase.cacheMiss}`)
check('isPeakHour 峰时 true', isPeakHour(Date.parse('2026-08-20T02:30:00Z'), peak.effectiveAtMs, DEFAULT_PEAK_WINDOWS) === true)
check('isPeakHour 谷时 false', isPeakHour(Date.parse('2026-08-20T05:00:00Z'), peak.effectiveAtMs, DEFAULT_PEAK_WINDOWS) === false)
check('priceEntryFor 未知模型回退 default', priceEntryFor('nope', DEFAULT_PRICE_TABLE) === DEFAULT_PRICE_TABLE.default)
check('normalizePrice 补齐缺字段', normalizePrice({ cacheMiss: 1 })?.cacheHit === 0 && normalizePrice({ cacheMiss: 1 })?.output === 0)
check('normalizePrice 非法返回 null', normalizePrice(null) === null)

// 2) 配置补丁校验。
const { Ledger, applyConfigPatch, defaultConfig, localDayKey } = await import('../lib/store.js')
const cfg = defaultConfig()
const ok = applyConfigPatch(cfg, { locale: 'en', statsLine: false, historyDays: 30, budget: { enabled: true, amount: 50, period: 'custom', customStart: '2026-08-01' } })
check('合法补丁通过', ok.errors.length === 0 && ok.config.locale === 'en' && ok.config.budget.period === 'custom', ok.errors.join(';'))
const bad = applyConfigPatch(cfg, { historyDays: 1 })
check('非法 historyDays 被拒', bad.errors.length > 0, bad.errors.join(';'))
const unknown = applyConfigPatch(cfg, { bogus: 1 })
check('未知键被拒', unknown.errors.length > 0)
const badBudget = applyConfigPatch(cfg, { budget: { period: 'custom', customStart: null } })
check('custom 缺开始日期被拒', badBudget.errors.length > 0, badBudget.errors.join(';'))

// 3) 账本:聚合、会话拆分、持久化 round-trip、历史。
const ledger = Ledger.open()
const now = Date.now()
ledger.account({ input: 1000, output: 500, cacheRead: 200, cacheWrite: 100 }, 'deepseek-v4-flash', 'sess-1', now)
ledger.account({ input: 300, output: 100, cacheRead: 0, cacheWrite: 0 }, 'deepseek-chat', 'sess-1', now)
ledger.account({ input: 50, output: 20, cacheRead: 0, cacheWrite: 0 }, 'unknown-model', null, now)
ledger.flush()
const dayKey = localDayKey(now)
const reloaded = Ledger.open()
check('账本持久化 calls=3', reloaded.days[dayKey]?.calls === 3, `calls=${reloaded.days[dayKey]?.calls}`)
const today = reloaded.today()
check('今日聚合 calls=3 且 cost>0', today.calls === 3 && today.cost > 0, `calls=${today.calls} cost=${today.cost}`)
check('会话拆分 sess-1 calls=2', today.sessions.length === 1 && today.sessions[0].id === 'sess-1' && today.sessions[0].calls === 2)
check('未知模型按 default 计价入账', reloaded.sumDays(undefined).calls === 3)
check('本月前缀聚合 calls=3', reloaded.sumDays(dayKey.slice(0, 7)).calls === 3)
const ranged = reloaded.sumRange(dayKey, dayKey)
check('自定义区间聚合 calls=3', ranged.calls === 3)
check('历史列表 1 天且无会话明细', reloaded.history().length === 1 && reloaded.history()[0].sessions.length === 0)
ledger.close()

// 3.5) close() 必须落盘最后一次挂起写入(回归:close 先置 closed 再 flush 会丢数据)。
{
  const lg = Ledger.open() // 复用同一 DSH_HOME,账本已有 3 次调用
  lg.account({ input: 77, output: 3, cacheRead: 0, cacheWrite: 0 }, 'deepseek-v4-flash', 'sess-close', Date.now())
  lg.close() // 不显式 flush,直接 close
  const again = Ledger.open()
  check('close() 落盘挂起写入', again.today().calls === 4 && again.today().sessions.some((s) => s.id === 'sess-close'),
    `calls=${again.today().calls}`)
  again.close()
}

// 4) 余额端点白名单 + 投影折叠。
const { balanceEndpoint, costUsageProjectionDefinition, apply } = await import('../lib/index.js')
check('官方端点解析', balanceEndpoint('https://api.deepseek.com') === 'https://api.deepseek.com/user/balance')
check('/v1 后缀剥离', balanceEndpoint('https://api.deepseek.com/v1') === 'https://api.deepseek.com/user/balance')
check('非官方端点拒绝', balanceEndpoint('https://evil.example.com') === null)
check('空 baseURL 回退官方', balanceEndpoint('') === 'https://api.deepseek.com/user/balance')

const def = costUsageProjectionDefinition
let proj = def.init()
proj = def.apply(proj, { type: 'request/header', data: { header: { config: { model: 'deepseek-v4-pro' } } } })
proj = def.apply(proj, { type: 'assistant/chunk', data: { turn: 1, step: 2, chunk: { type: 'usage', usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 } } } })
const v1 = def.view(proj)
check('投影折叠 input=100/output=50', v1.input === 100 && v1.output === 50 && v1.byModel['deepseek-v4-pro'] !== undefined)
proj = def.apply(proj, { type: 'assistant/message', data: { turn: 1, step: 2, usage: { inputTokens: 150, outputTokens: 60, cacheReadTokens: 0, cacheWriteTokens: 0 } } })
const v2 = def.view(proj)
check('流式样本替换 input=150/output=60', v2.input === 150 && v2.output === 60, `input=${v2.input} output=${v2.output}`)

// 5) 真实 cordis 加载:apply 不抛,llm/stream 计费包裹把 usage 计入账本,billing 服务可读。
const CORDIS_CANDIDATES = [
  'file:///E:/node-v18.8.0-win-x64/node_cache/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai/cordis/lib/index.js',
  'file:///C:/Users/asus/.dsh/profiles/node_modules/@deepseek-ai/cordis/lib/index.js',
]
let cordis = null
for (const candidate of CORDIS_CANDIDATES) {
  try {
    cordis = await import(candidate)
    break
  } catch { /* try next */ }
}
if (cordis === null) {
  console.error('[FAIL] 找不到 cordis 运行时,跳过 cordis 集成验证')
  failures += 1
} else {
  const ctx = new cordis.Context()
  ctx.provide('sessionProjections', { register: (defn) => { console.log('[ok] 投影已注册:', defn.key) } })
  await ctx.inject(['sessionProjections'], (injectedCtx) => apply(injectedCtx))
  check('apply() 在真实 cordis 上下文加载成功(无 ctx.interval 崩溃)', true)

  const service = ctx.get('billing')
  check('billing 服务已提供', service !== undefined && typeof service.getState === 'function')

  // 清空单元测试遗留账本,从零验证计费包裹。
  const fresh = await service.resetHistory()
  check('resetHistory 清空账本', fresh.ok === true && fresh.state.today.calls === 0 && fresh.state.total.calls === 0)

  // 模拟一次带 usage 的 llm/stream 调用。
  async function* fakeStream() {
    yield { type: 'text', text: 'hi' }
    yield { type: 'usage', usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 200, cacheWriteTokens: 100 } }
    yield { type: 'finish', reason: { kind: 'completed' } }
  }
  const stream = ctx.waterfall(null, 'llm/stream', { model: 'deepseek-v4-flash', sessionId: 'billing-test' }, () => fakeStream())
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  check('llm/stream 透传全部 3 个块', chunks.length === 3)

  const state = await service.getState()
  check('账本计入今日 calls=1', state.today.calls === 1, `calls=${state.today.calls}`)
  check('账本计入今日 cost>0', state.today.cost > 0, `cost=${state.today.cost}`)
  check('会话拆分 billing-test', state.today.sessions.some((s) => s.id === 'billing-test'))
  check('默认配置 statsLine=true', state.config.statsLine === true && state.config.balance.display === 'both')
  check('默认价格表含 deepseek-v4-flash', state.config.prices.models['deepseek-v4-flash'] !== undefined)

  const updated = await service.updateConfig({ locale: 'en', statsLine: false, budget: { enabled: true, amount: 42 } })
  check('updateConfig 生效', updated.config.locale === 'en' && updated.config.statsLine === false && updated.config.budget.enabled === true)
  const rejected = await service.updateConfig({ historyDays: 0 }).then(() => null, (error) => error)
  check('updateConfig 非法值被拒', rejected !== null && /historyDays/.test(String(rejected.message ?? rejected)))
  const cleared = await service.resetHistory()
  check('resetHistory 再次清空', cleared.ok === true && cleared.state.today.calls === 0)

  await (ctx[Symbol.dispose] ? ctx[Symbol.dispose]() : ctx.stop?.())
}

// 6) Typert 清单可导入且与客户端描述符一一对应。
const { TYPERT } = await import('../lib/typert.host.js')
check('Typert 清单 5 个调用', TYPERT.invocations.length === 5, TYPERT.invocations.map(i => i.method).join(' | '))
check('Typert 服务键 billing', TYPERT.model.services[0].key === 'billing')

console.log(failures === 0 ? '\n[ok] 全部验证通过' : `\n[FAIL] ${failures} 项未通过`)
process.exit(failures === 0 ? 0 : 1)
