/**
 * dsh-billing 的 Host 面 Typert 清单(由 typert-loader 自动扫描注册)。
 * 手写清单,结构与 @deepseek-ai/dsh-typert-generator 产物一致:
 * `./typert` 导出 TYPERT,invocations 的 codec 必须是 zod v4 实例。
 */

import { z } from 'zod'

const num = z.number()

const balanceSchema = z.object({
  status: z.enum(['off', 'ok', 'error']),
  message: z.string(),
  fetchedAt: num,
  currency: z.string(),
  totalBalance: num,
  grantedBalance: num,
  toppedUpBalance: num,
})

const tierSchema = z.object({
  cacheHit: num,
  cacheMiss: num,
  output: num,
})

const priceSchema = z.object({
  cacheHit: num,
  cacheMiss: num,
  output: num,
  offPeak: tierSchema.optional(),
  peak: tierSchema.optional(),
  legacy: z.boolean().optional(),
})

const pricesSchema = z.object({
  models: z.record(z.string(), priceSchema),
  default: priceSchema,
})

const budgetSchema = z.object({
  enabled: z.boolean(),
  amount: num,
  period: z.enum(['day', 'month', 'all', 'custom']),
  customStart: z.string().nullable(),
  customEnd: z.string().nullable(),
})

const balanceConfigSchema = z.object({
  display: z.enum(['sidebar', 'settings', 'both', 'off']),
  refreshMinutes: num,
})

const configSchema = z.object({
  locale: z.enum(['auto', 'zh', 'en']),
  statsLine: z.boolean(),
  sidebar: z.boolean(),
  currency: z.string(),
  symbol: z.string(),
  decimals: num,
  exchangeRate: num,
  peakEnabled: z.boolean(),
  peakEffectiveAt: z.string(),
  peakWindows: z.array(z.object({ start: num, end: num })),
  prices: pricesSchema,
  budget: budgetSchema,
  balance: balanceConfigSchema,
  historyDays: num,
  fetchedAt: z.string().nullable(),
  priceSource: z.string(),
})

const sessionSchema = z.object({
  id: z.string(),
  input: num,
  output: num,
  cacheRead: num,
  cacheWrite: num,
  calls: num,
  cost: num,
})

const daySchema = z.object({
  date: z.string(),
  input: num,
  output: num,
  cacheRead: num,
  cacheWrite: num,
  calls: num,
  cost: num,
  sessions: z.array(sessionSchema),
})

const stateSchema = z.object({
  today: daySchema,
  month: daySchema,
  total: daySchema,
  budgetUsed: num,
  balance: balanceSchema,
  history: z.array(daySchema),
  config: configSchema,
  meta: z.object({
    now: num,
    timezoneOffsetMinutes: num,
    dayKey: z.string(),
    monthKey: z.string(),
  }),
})

const patchSchema = z.record(z.string(), z.unknown())

const refreshSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  state: stateSchema.optional(),
})

const _state$codec = { mode: 'strict', typeSymbol: 'dsh-billing#State', schema: stateSchema }
const _patch$codec = { mode: 'strict', typeSymbol: 'dsh-billing#ConfigPatch', schema: patchSchema }
const _refresh$codec = { mode: 'strict', typeSymbol: 'dsh-billing#ActionResult', schema: refreshSchema }

export const TYPERT = {
  package: 'dsh-billing',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: 'dsh-billing#billing/getState',
      service: 'billing',
      namespace: 'billing',
      method: 'getState',
      invocation: { kind: 'direct' },
      parameters: [],
      result: _state$codec,
    },
    {
      id: 'dsh-billing#billing/updateConfig',
      service: 'billing',
      namespace: 'billing',
      method: 'updateConfig',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'patch', wire: 'patch', source: 'json', codec: _patch$codec },
      ],
      result: _state$codec,
    },
    {
      id: 'dsh-billing#billing/refreshBalance',
      service: 'billing',
      namespace: 'billing',
      method: 'refreshBalance',
      invocation: { kind: 'direct' },
      parameters: [],
      result: _refresh$codec,
    },
    {
      id: 'dsh-billing#billing/fetchPrices',
      service: 'billing',
      namespace: 'billing',
      method: 'fetchPrices',
      invocation: { kind: 'direct' },
      parameters: [],
      result: _refresh$codec,
    },
    {
      id: 'dsh-billing#billing/resetHistory',
      service: 'billing',
      namespace: 'billing',
      method: 'resetHistory',
      invocation: { kind: 'direct' },
      parameters: [],
      result: _refresh$codec,
    },
  ],
  model: {
    services: [
      {
        description: 'dsh-billing 账本与费用服务(ctx.billing)。Ledger & cost service (ctx.billing).',
        summary: 'dsh-billing 账本与费用服务 (ledger & cost service)。',
        tags: [],
        jsDoc: '/** dsh-billing 账本与费用服务(ctx.billing)。*/',
        key: 'billing',
        exportName: 'BillingService',
        members: [
          {
            kind: 'method',
            name: 'getState',
            signature: 'getState(): State',
            summary: '读取账本汇总、余额快照与当前配置。Read the ledger summary, balance snapshot and current config.',
            jsDoc: '/**\n * 读取账本汇总、余额快照与当前配置。\n * @returns 今日/本月/累计/预算/余额/历史与配置快照。\n * Read the ledger summary, balance snapshot and current config.\n * @returns Today/month/total/budget/balance/history and config snapshot.\n */',
          },
          {
            kind: 'method',
            name: 'updateConfig',
            signature: 'updateConfig(patch: ConfigPatch): State',
            summary: '深合并一份配置补丁并持久化。Deep-merge a config patch and persist it.',
            jsDoc: '/**\n * 深合并一份配置补丁并持久化。\n * @param patch - 配置补丁。\n * @returns 更新后的完整快照。\n * Deep-merge a config patch and persist it.\n * @param patch - The config patch.\n * @returns The updated full snapshot.\n */',
          },
          {
            kind: 'method',
            name: 'refreshBalance',
            signature: 'refreshBalance(): Promise<ActionResult>',
            summary: '立即查询官方开放平台账户余额。Query the official open-platform account balance immediately.',
            jsDoc: '/**\n * 立即查询官方开放平台账户余额。\n * @returns 查询结果与最新快照。\n * Query the official open-platform account balance immediately.\n * @returns The query result and the latest snapshot.\n */',
          },
          {
            kind: 'method',
            name: 'fetchPrices',
            signature: 'fetchPrices(): Promise<ActionResult>',
            summary: '抓取官方定价页并应用最新价格。Fetch the official pricing page and apply the latest prices.',
            jsDoc: '/**\n * 抓取官方定价页并应用最新价格。\n * @returns 同步结果与最新快照。\n * Fetch the official pricing page and apply the latest prices.\n * @returns The sync result and the latest snapshot.\n */',
          },
          {
            kind: 'method',
            name: 'resetHistory',
            signature: 'resetHistory(): Promise<ActionResult>',
            summary: '清除全部历史记录。Clear all ledger history.',
            jsDoc: '/**\n * 清除全部历史记录。\n * @returns 操作结果与最新快照。\n * Clear all ledger history.\n * @returns The operation result and the latest snapshot.\n */',
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
}

export default TYPERT
