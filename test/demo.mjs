/**
 * dsh-billing 计费演示:用真实插件代码模拟一次「工作会话」的多次模型调用
 * (主循环 + 子代理 + 压缩 + 标题 + 峰谷时段调用),输出账本、汇总、预算。
 *
 * 用法:node test/demo.mjs
 */
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

process.env.DSH_HOME = join(tmpdir(), 'dsh-billing-demo')
rmSync(process.env.DSH_HOME, { recursive: true, force: true })
mkdirSync(process.env.DSH_HOME, { recursive: true })

const { apply } = await import('../lib/index.js')
const cordis = await import('file:///E:/node-v18.8.0-win-x64/node_cache/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai/cordis/lib/index.js')

const ctx = new cordis.Context()
ctx.provide('sessionProjections', { register: () => {} })
await ctx.inject(['sessionProjections'], (ic) => apply(ic))
const service = ctx.get('billing')

const realNow = Date.now
/** 以指定时刻消费一条模拟 llm/stream(包裹内部用 Date.now() 计费)。 */
async function billAt(atMs, model, sessionId, usage) {
  async function* fakeStream() {
    yield { type: 'text', text: 'demo' }
    yield { type: 'usage', usage }
    yield { type: 'finish', reason: { kind: 'completed' } }
  }
  Date.now = () => atMs
  try {
    const stream = ctx.waterfall(null, 'llm/stream', { model, sessionId }, () => fakeStream())
    for await (const _chunk of stream) { /* consume */ }
  } finally {
    Date.now = realNow
  }
}

const t0 = Date.UTC(2026, 7, 16, 13, 0, 0) // 2026-08-16 13:00 UTC(峰谷生效前 → 基础价)
console.log('=== 模拟调用 ===')
console.log('T+0  主循环 deepseek-v4-flash  基础价  input 120K  cacheR 800K  cacheW 20K  out 15K')
await billAt(t0, 'deepseek-v4-flash', 'main-8f3a2c91', { inputTokens: 120_000, outputTokens: 15_000, cacheReadTokens: 800_000, cacheWriteTokens: 20_000 })
console.log('T+1  子代理 deepseek-v4-flash  基础价  input 45K   cacheR 120K  out 8K')
await billAt(t0 + 4_000, 'deepseek-v4-flash', 'sub-b7d0e114', { inputTokens: 45_000, outputTokens: 8_000, cacheReadTokens: 120_000, cacheWriteTokens: 0 })
console.log('T+2  压缩(无会话)            基础价  input 200K  out 2K')
await billAt(t0 + 60_000, 'deepseek-v4-flash', undefined, { inputTokens: 200_000, outputTokens: 2_000, cacheReadTokens: 0, cacheWriteTokens: 0 })
console.log('T+3  标题(无会话)            基础价  input 6K    out 300')
await billAt(t0 + 120_000, 'deepseek-v4-flash', undefined, { inputTokens: 6_000, outputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 0 })
console.log('T+4  次日 02:00 UTC 峰时段   deepseek-v4-flash  峰价  input 30K  out 4K')
await billAt(Date.UTC(2026, 7, 17, 2, 0, 0), 'deepseek-v4-flash', 'main-8f3a2c91', { inputTokens: 30_000, outputTokens: 4_000, cacheReadTokens: 50_000, cacheWriteTokens: 0 })
console.log('T+5  次日 11:00 UTC 谷时段   deepseek-v4-pro    谷价  input 60K  cacheR 40K  out 6K')
await billAt(Date.UTC(2026, 7, 17, 11, 0, 0), 'deepseek-v4-pro', 'sub-c19f5a77', { inputTokens: 60_000, outputTokens: 6_000, cacheReadTokens: 40_000, cacheWriteTokens: 0 })

// 打开预算(月度,¥10)演示预算已用百分比。
await service.updateConfig({ budget: { enabled: true, amount: 10, period: 'month' } })

const state = await service.getState()
const fmt = (usd) => {
  const v = usd * state.config.exchangeRate
  return `¥${v.toFixed(4)}`
}
console.log('\n=== 账本汇总(配置:币种 CNY,汇率 7.2,预算 ¥10/月)===')
console.log(`今日 2026-08-16 : ${state.today.calls} 次调用  输入 ${state.today.input.toLocaleString()} / 缓存 ${(state.today.cacheRead + state.today.cacheWrite).toLocaleString()} / 输出 ${state.today.output.toLocaleString()} tok  费用 ${fmt(state.today.cost)}`)
console.log(`本月 2026-08     : ${state.month.calls} 次调用  费用 ${fmt(state.month.cost)}`)
console.log(`累计             : ${state.total.calls} 次调用  费用 ${fmt(state.total.cost)}`)
console.log(`预算已用(USD→CNY): ${fmt(state.budgetUsed)} / ¥10.0000  (${((state.budgetUsed * state.config.exchangeRate / 10) * 100).toFixed(1)}%)`)
console.log('\n今日会话明细:')
for (const s of state.today.sessions) {
  console.log(`  ${s.id.padEnd(12)} ${String(s.calls).padStart(2)} 次调用  输入 ${s.input.toLocaleString()}  费用 ${fmt(s.cost)}`)
}
console.log('\n历史记录(按天):')
for (const d of state.history) {
  console.log(`  ${d.date}  ${d.calls} 次调用  费用 ${fmt(d.cost)}`)
}
console.log('\n=== 账本文件(ledger.json,原子写持久化)===')
// 账本写入有 2 秒防抖:等待防抖落盘后读取(cordis 上下文的 effect 清理不保证同步触发)。
await new Promise((resolve) => setTimeout(resolve, 2300))
console.log(readFileSync(join(process.env.DSH_HOME, 'storages', 'dsh-billing', 'ledger.json'), 'utf8'))

await (ctx[Symbol.dispose] ? ctx[Symbol.dispose]() : ctx.stop?.())
