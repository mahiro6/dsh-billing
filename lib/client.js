/**
 * dsh-billing browser half (built-bundle format consumed by the client module
 * loader; written by hand, no build step required).
 *
 * Surfaces:
 *  - `conversation.composer.dock` "stats" cell (priority -1, shadows the stock
 *    StatsLine): balance + this session's tokens/cost + today's cost;
 *  - `sidebar.footer.action`: balance row + today's cost + budget progress;
 *  - `settings.section`: billing settings page (balance, summary cards,
 *    budget, today's sessions, history, price table + official sync, display
 *    settings, data).
 *
 * Data channels:
 *  - `costUsage` session projection (host-registered) → per-session token
 *    buckets, priced client-side against the config price table (current tier);
 *  - `remote.billing.*` (Typert RPC) → ledger snapshot (today/month/total/
 *    budget/balance/history) + config.
 */
window.__ModuleLoader__.load({
  id: "dsh-billing",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

    //#region css
    const css = [
      ".bl-root{text-align:center;max-width:var(--dsh-chat-content-width);box-sizing:border-box;width:100%;padding:4px calc(var(--dsh-composer-side-clearance) + 16px) 0px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;margin:0 auto;font-size:12px;line-height:20px;display:block;overflow:hidden}",
      ".bl-sep{color:var(--dsw-alias-separator-primary);margin:0 10px}",
      ".bl-strong{color:var(--dsw-alias-label-secondary)}",
      ".bl-sidebar{display:block;width:100%;padding:2px 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;cursor:default}",
      ".bl-sidebar-row{display:flex;align-items:center;gap:6px}",
      ".bl-sidebar-row svg{flex:none}",
      ".bl-sidebar .bl-amt{color:var(--dsw-alias-label-primary);font-weight:500}",
      ".bl-sidebar .bl-split{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-caption)}",
      ".bl-sidebar .bl-today{font-size:11px;color:var(--dsw-alias-label-caption);margin-top:1px}",
      ".bl-err{color:var(--dsw-alias-state-danger-primary)}",
      ".bl-budget-track{height:3px;border-radius:2px;background:var(--dsw-alias-border-l1);margin-top:4px;overflow:hidden}",
      ".bl-budget-fill{height:100%;border-radius:2px;background:var(--dsw-alias-state-business-primary);transition:width .3s ease}",
      ".bl-budget-fill.bl-warn{background:var(--dsw-alias-state-warning-primary)}",
      ".bl-budget-fill.bl-over{background:var(--dsw-alias-state-danger-primary)}",
      ".bl-section{padding:0 2px}",
      ".bl-section h3{font-size:13px;font-weight:600;margin:14px 0 8px;color:var(--dsw-alias-label-primary)}",
      ".bl-section h3:first-child{margin-top:0}",
      ".bl-field{margin:0 0 10px}",
      ".bl-field>label{display:block;font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:4px}",
      ".bl-field select,.bl-field input[type=number],.bl-field input[type=text],.bl-field input[type=date]{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:6px;font-size:13px;line-height:20px;padding:4px 8px;outline:none}",
      ".bl-field select:focus,.bl-field input:focus{border-color:var(--dsw-alias-state-business-primary)}",
      ".bl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:0 0 10px}",
      ".bl-card{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-base)}",
      ".bl-card .bl-card-k{font-size:11px;color:var(--dsw-alias-label-caption)}",
      ".bl-card .bl-card-v{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:2px}",
      ".bl-card .bl-card-s{font-size:11px;color:var(--dsw-alias-label-caption);margin-top:2px}",
      ".bl-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".bl-row:last-child{border-bottom:none}",
      ".bl-row .bl-k{color:var(--dsw-alias-label-secondary);font-size:12px}",
      ".bl-row .bl-v{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}",
      ".bl-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:6px;font-size:12px;line-height:20px;padding:3px 10px;cursor:pointer}",
      ".bl-btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}",
      ".bl-btn:disabled{opacity:.5;cursor:default}",
      ".bl-table{width:100%;border-collapse:collapse;font-size:11px;margin:0 0 10px}",
      ".bl-table th{text-align:left;color:var(--dsw-alias-label-caption);font-weight:500;padding:3px 6px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}",
      ".bl-table td{padding:3px 6px;color:var(--dsw-alias-label-secondary);border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap;font-variant-numeric:tabular-nums}",
      ".bl-table td.bl-num{text-align:right}",
      ".bl-table td.bl-cost{color:var(--dsw-alias-label-primary);font-weight:500}",
      ".bl-table .bl-sid{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-caption);max-width:90px;overflow:hidden;text-overflow:ellipsis}",
      ".bl-note{font-size:11px;color:var(--dsw-alias-label-caption);margin:8px 0 0}",
      ".bl-price{font-variant-numeric:tabular-nums}",
      ".bl-tier{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:2px 0 4px}",
      ".bl-tier .bl-tier-k{font-size:11px;color:var(--dsw-alias-label-caption);min-width:52px}",
      ".bl-tier input{width:64px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:5px;font-size:11px;line-height:18px;padding:1px 5px;outline:none;text-align:right}",
      ".bl-tier input:focus{border-color:var(--dsw-alias-state-business-primary)}",
      ".bl-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
      ".bl-msg{padding:2px 0;font-size:12px}",
      ".bl-msg.bl-ok{color:var(--dsw-alias-state-success-primary)}",
      ".bl-msg.bl-err{color:var(--dsw-alias-state-danger-primary)}",
      ".bl-hr{border:none;border-top:1px solid var(--dsw-alias-border-l1);margin:12px 0}",
    ].join("");
    const tagId = "dsh-billing/main.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-billing";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    //#endregion

    //#region styles
    const styles = {
      root: "bl-root",
      sep: "bl-sep",
      strong: "bl-strong",
      sidebar: "bl-sidebar",
      sidebarRow: "bl-sidebar-row",
      amt: "bl-amt",
      split: "bl-split",
      today: "bl-today",
      err: "bl-err",
      budgetTrack: "bl-budget-track",
      budgetFill: "bl-budget-fill",
      warn: "bl-warn",
      over: "bl-over",
      section: "bl-section",
      field: "bl-field",
      grid: "bl-grid",
      card: "bl-card",
      cardK: "bl-card-k",
      cardV: "bl-card-v",
      cardS: "bl-card-s",
      row: "bl-row",
      k: "bl-k",
      v: "bl-v",
      btn: "bl-btn",
      table: "bl-table",
      note: "bl-note",
      price: "bl-price",
      tier: "bl-tier",
      tierK: "bl-tier-k",
      ok: "bl-ok",
      hr: "bl-hr",
    };
    //#endregion

    //#region i18n
    const MESSAGES = {
      zh: {
        sectionLabel: "费用",
        balanceTitle: "官方余额",
        balanceLoading: "余额 …",
        balanceError: "余额 --",
        balanceTotal: "总余额",
        balanceGranted: "赠送",
        balanceToppedUp: "充值",
        balanceRefresh: "刷新余额",
        balanceRefreshing: "刷新中…",
        balanceRefreshed: "已刷新",
        balanceFailed: "查询失败",
        statsBalance: "余额 {amount}",
        statsTask: "本会话 {tokens} tok · {cost}",
        statsToday: "今日 {cost}",
        statsCounts: "{turns} 轮 · {steps} 步",
        statsLlm: "LLM {duration}",
        statsToolCall: "工具调用 {duration}",
        statsTtftAverage: "首 token 平均 {duration}",
        statsTokensPerSecond: "{throughput} tok/s",
        statsCacheHit: "缓存命中 {percent}%",
        statsTokens: "输入 {input} tok · 输出 {output} tok",
        summaryTitle: "汇总",
        summaryToday: "今日",
        summaryMonth: "本月",
        summaryTotal: "累计",
        summaryCalls: "{calls} 次调用",
        summaryTokens: "输入 {input} · 输出 {output}",
        budgetTitle: "预算",
        budgetEnabled: "启用预算",
        budgetAmount: "预算额度(显示币种)",
        budgetPeriod: "预算周期",
        budgetPeriodDay: "今日",
        budgetPeriodMonth: "本月",
        budgetPeriodAll: "累计",
        budgetPeriodCustom: "自定义区间",
        budgetCustomStart: "开始日期",
        budgetCustomEnd: "结束日期(留空 = 今日)",
        budgetUsed: "已用 {amount} / {total} ({percent}%)",
        budgetUsedShort: "预算 {percent}%",
        sessionsTitle: "今日会话明细",
        historyTitle: "历史记录(按天)",
        historyEmpty: "暂无记录",
        priceTitle: "价格表(美元 / 1M tokens)",
        priceDefault: "默认价格",
        priceCacheHit: "命中",
        priceCacheMiss: "未命中",
        priceOutput: "输出",
        priceModel: "模型",
        priceTierBase: "基础价",
        priceTierOffPeak: "谷时价",
        priceTierPeak: "峰时价",
        pricePeakEnabled: "启用峰谷计价",
        pricePeakEffectiveAt: "峰谷生效时间(UTC ISO)",
        pricePeakWindows: "峰时段(UTC 小时,[开始,结束))",
        priceSync: "同步官方价格",
        priceSyncing: "同步中…",
        priceSource: "价格来源:{source}",
        priceSourceBundled: "内置",
        priceSourceOfficial: "官方",
        displayTitle: "显示设置",
        fieldStatsLine: "会话统计行显示余额与费用",
        fieldSidebar: "侧边栏显示余额/今日/预算",
        fieldLocale: "界面语言",
        fieldLocaleAuto: "跟随浏览器",
        fieldLocaleZh: "简体中文",
        fieldLocaleEn: "English",
        fieldCurrency: "显示币种",
        fieldSymbol: "货币符号",
        fieldDecimals: "小数位数",
        fieldExchangeRate: "汇率(1 USD = ?)",
        fieldRefresh: "余额自动刷新间隔(分钟)",
        fieldHistoryDays: "账本保留天数",
        dataTitle: "数据",
        dataReset: "清除全部历史",
        dataResetting: "清除中…",
        fieldBalanceDisplay: "余额显示位置",
        fieldBalanceDisplaySidebar: "侧边栏",
        fieldBalanceDisplaySettings: "设置页",
        fieldBalanceDisplayBoth: "两处",
        fieldBalanceDisplayOff: "关闭",
        saveLabel: "保存设置",
        saving: "保存中…",
        saved: "已保存",
        rpcFailed: "RPC 调用失败:{method}",
        rpcBalanceFailed: "余额刷新失败",
        fetchedAt: "最近同步:{time}",
        sessionCol: "会话",
        callsCol: "调用",
        inputCol: "输入",
        cacheCol: "缓存",
        outputCol: "输出",
        costCol: "费用",
        dateCol: "日期",
        tokensCol: "Token",
        sectionNote: "账本按每次模型调用精确计费(含子代理、压缩、标题等辅助调用);金额以美元存储,汇率仅影响显示;余额查询仅发往官方域名 api.deepseek.com。",
      },
      en: {
        sectionLabel: "Cost",
        balanceTitle: "Official balance",
        balanceLoading: "Balance …",
        balanceError: "Balance --",
        balanceTotal: "Total",
        balanceGranted: "Granted",
        balanceToppedUp: "Topped up",
        balanceRefresh: "Refresh",
        balanceRefreshing: "Refreshing…",
        balanceRefreshed: "Refreshed",
        balanceFailed: "Failed",
        statsBalance: "Balance {amount}",
        statsTask: "Session {tokens} tok · {cost}",
        statsToday: "Today {cost}",
        statsCounts: "{turns} turns · {steps} steps",
        statsLlm: "LLM {duration}",
        statsToolCall: "Tool call {duration}",
        statsTtftAverage: "TTFT avg {duration}",
        statsTokensPerSecond: "{throughput} tok/s",
        statsCacheHit: "Cache hit {percent}%",
        statsTokens: "Input {input} tok · Output {output} tok",
        summaryTitle: "Summary",
        summaryToday: "Today",
        summaryMonth: "Month",
        summaryTotal: "Total",
        summaryCalls: "{calls} calls",
        summaryTokens: "In {input} · Out {output}",
        budgetTitle: "Budget",
        budgetEnabled: "Enable budget",
        budgetAmount: "Budget amount (display currency)",
        budgetPeriod: "Budget period",
        budgetPeriodDay: "Today",
        budgetPeriodMonth: "This month",
        budgetPeriodAll: "All time",
        budgetPeriodCustom: "Custom range",
        budgetCustomStart: "Start date",
        budgetCustomEnd: "End date (empty = today)",
        budgetUsed: "Used {amount} / {total} ({percent}%)",
        budgetUsedShort: "Budget {percent}%",
        sessionsTitle: "Today's sessions",
        historyTitle: "History (by day)",
        historyEmpty: "No records yet",
        priceTitle: "Price table (USD / 1M tokens)",
        priceDefault: "Default price",
        priceCacheHit: "Hit",
        priceCacheMiss: "Miss",
        priceOutput: "Output",
        priceModel: "Model",
        priceTierBase: "Base",
        priceTierOffPeak: "Off-peak",
        priceTierPeak: "Peak",
        pricePeakEnabled: "Enable peak/off-peak pricing",
        pricePeakEffectiveAt: "Peak effective at (UTC ISO)",
        pricePeakWindows: "Peak windows (UTC hours, [start, end))",
        priceSync: "Sync official prices",
        priceSyncing: "Syncing…",
        priceSource: "Price source: {source}",
        priceSourceBundled: "bundled",
        priceSourceOfficial: "official",
        displayTitle: "Display",
        fieldStatsLine: "Show balance & cost on the conversation stats line",
        fieldSidebar: "Show balance / today / budget in the sidebar",
        fieldLocale: "Language",
        fieldLocaleAuto: "Follow browser",
        fieldLocaleZh: "简体中文",
        fieldLocaleEn: "English",
        fieldCurrency: "Display currency",
        fieldSymbol: "Currency symbol",
        fieldDecimals: "Decimals",
        fieldExchangeRate: "Exchange rate (1 USD = ?)",
        fieldRefresh: "Balance auto-refresh interval (minutes)",
        fieldHistoryDays: "Ledger retention (days)",
        dataTitle: "Data",
        dataReset: "Clear all history",
        dataResetting: "Clearing…",
        fieldBalanceDisplay: "Balance display",
        fieldBalanceDisplaySidebar: "Sidebar",
        fieldBalanceDisplaySettings: "Settings",
        fieldBalanceDisplayBoth: "Both",
        fieldBalanceDisplayOff: "Off",
        saveLabel: "Save settings",
        saving: "Saving…",
        saved: "Saved",
        rpcFailed: "RPC call failed: {method}",
        rpcBalanceFailed: "Balance refresh failed",
        fetchedAt: "Last sync: {time}",
        sessionCol: "Session",
        callsCol: "Calls",
        inputCol: "Input",
        cacheCol: "Cache",
        outputCol: "Output",
        costCol: "Cost",
        dateCol: "Date",
        tokensCol: "Tokens",
        sectionNote: "Every model call is billed exactly into the ledger (including sub-agents, compaction and title calls). Amounts are stored in USD; the exchange rate only affects display. Balance lookups only go to the official api.deepseek.com endpoint.",
      },
    };

    function resolveLocale(configLocale) {
      if (configLocale === "zh" || configLocale === "en") return configLocale;
      if (typeof navigator !== "undefined" && /^zh/i.test(navigator.language || "")) return "zh";
      return "en";
    }
    function makeT(locale) {
      const dict = locale === "en" ? MESSAGES.en : MESSAGES.zh;
      return (key, vars) => {
        let text = dict[key] ?? key;
        if (vars) for (const k of Object.keys(vars)) text = text.split(`{${k}}`).join(String(vars[k]));
        return text;
      };
    }
    //#endregion

    //#region codecs (hand-written parse functions, mirror of typert.host.js)
    function fail(path, expected) {
      throw new Error(`invalid ${path}: expected ${expected}`)
    }
    function num(v, dflt) {
      return typeof v === 'number' && Number.isFinite(v) ? v : (dflt ?? 0)
    }
    function parseBalance(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      return {
        status: v.status === 'ok' || v.status === 'error' ? v.status : 'off',
        message: typeof v.message === 'string' ? v.message : '',
        fetchedAt: num(v.fetchedAt, 0),
        currency: typeof v.currency === 'string' ? v.currency : '',
        totalBalance: num(v.totalBalance, 0),
        grantedBalance: num(v.grantedBalance, 0),
        toppedUpBalance: num(v.toppedUpBalance, 0),
      }
    }
    function parseTier(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return undefined
      return { cacheHit: num(v.cacheHit, 0), cacheMiss: num(v.cacheMiss, 0), output: num(v.output, 0) }
    }
    function parsePrice(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      return {
        cacheHit: num(v.cacheHit, 0),
        cacheMiss: num(v.cacheMiss, 0),
        output: num(v.output, 0),
        offPeak: parseTier(v.offPeak, path + '.offPeak'),
        peak: parseTier(v.peak, path + '.peak'),
        legacy: v.legacy === true,
      }
    }
    function parseConfig(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      const prices = v.prices === null || typeof v.prices !== 'object' || Array.isArray(v.prices) ? {} : v.prices
      const models = prices.models === null || typeof prices.models !== 'object' || Array.isArray(prices.models) ? {} : prices.models
      const outModels = {}
      for (const key of Object.keys(models)) {
        try { outModels[key] = parsePrice(models[key], path + '.prices.models.' + key) } catch { /* skip bad rows */ }
      }
      const budgetRaw = v.budget === null || typeof v.budget !== 'object' ? {} : v.budget
      const balanceRaw = v.balance === null || typeof v.balance !== 'object' ? {} : v.balance
      const windows = Array.isArray(v.peakWindows) ? v.peakWindows.filter(w => w !== null && typeof w === 'object') : []
      return {
        locale: v.locale === 'zh' || v.locale === 'en' ? v.locale : 'auto',
        statsLine: v.statsLine !== false,
        sidebar: v.sidebar !== false,
        currency: typeof v.currency === 'string' ? v.currency : 'CNY',
        symbol: typeof v.symbol === 'string' ? v.symbol : '¥',
        decimals: num(v.decimals, 4),
        exchangeRate: typeof v.exchangeRate === 'number' && Number.isFinite(v.exchangeRate) && v.exchangeRate > 0 ? v.exchangeRate : 7.2,
        peakEnabled: v.peakEnabled !== false,
        peakEffectiveAt: typeof v.peakEffectiveAt === 'string' ? v.peakEffectiveAt : '2026-08-16T16:00:00Z',
        peakWindows: windows.map(w => ({ start: num(w.start, 0), end: num(w.end, 0) })),
        prices: {
          models: outModels,
          default: prices.default === undefined ? { cacheHit: 0.0028, cacheMiss: 0.14, output: 0.28 } : parsePrice(prices.default, path + '.prices.default'),
        },
        budget: {
          enabled: budgetRaw.enabled === true,
          amount: num(budgetRaw.amount, 100),
          period: ['day', 'month', 'all', 'custom'].includes(budgetRaw.period) ? budgetRaw.period : 'month',
          customStart: typeof budgetRaw.customStart === 'string' ? budgetRaw.customStart : null,
          customEnd: typeof budgetRaw.customEnd === 'string' ? budgetRaw.customEnd : null,
        },
        balance: {
          display: ['sidebar', 'settings', 'both', 'off'].includes(balanceRaw.display) ? balanceRaw.display : 'both',
          refreshMinutes: num(balanceRaw.refreshMinutes, 5),
        },
        historyDays: num(v.historyDays, 180),
        fetchedAt: typeof v.fetchedAt === 'string' ? v.fetchedAt : null,
        priceSource: v.priceSource === 'official' ? 'official' : 'bundled',
      }
    }
    function parseSession(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      return {
        id: typeof v.id === 'string' ? v.id : '',
        input: num(v.input, 0),
        output: num(v.output, 0),
        cacheRead: num(v.cacheRead, 0),
        cacheWrite: num(v.cacheWrite, 0),
        calls: num(v.calls, 0),
        cost: num(v.cost, 0),
      }
    }
    function parseDay(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      const sessions = Array.isArray(v.sessions) ? v.sessions.map((s, i) => parseSession(s, path + '.sessions.' + i)) : []
      return {
        date: typeof v.date === 'string' ? v.date : '',
        input: num(v.input, 0),
        output: num(v.output, 0),
        cacheRead: num(v.cacheRead, 0),
        cacheWrite: num(v.cacheWrite, 0),
        calls: num(v.calls, 0),
        cost: num(v.cost, 0),
        sessions,
      }
    }
    function parseState(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      const history = Array.isArray(v.history) ? v.history.map((d, i) => parseDay(d, path + '.history.' + i)) : []
      return {
        today: v.today === undefined || v.today === null ? parseDay({ date: '', sessions: [] }, path + '.today') : parseDay(v.today, path + '.today'),
        month: v.month === undefined || v.month === null ? parseDay({ date: '', sessions: [] }, path + '.month') : parseDay(v.month, path + '.month'),
        total: v.total === undefined || v.total === null ? parseDay({ date: 'total', sessions: [] }, path + '.total') : parseDay(v.total, path + '.total'),
        budgetUsed: num(v.budgetUsed, 0),
        balance: v.balance === undefined || v.balance === null
          ? { status: 'off', message: '', fetchedAt: 0, currency: '', totalBalance: 0, grantedBalance: 0, toppedUpBalance: 0 }
          : parseBalance(v.balance, path + '.balance'),
        history,
        config: v.config === undefined || v.config === null ? null : parseConfig(v.config, path + '.config'),
        meta: {
          now: num(v.meta?.now, Date.now()),
          timezoneOffsetMinutes: num(v.meta?.timezoneOffsetMinutes, 0),
          dayKey: typeof v.meta?.dayKey === 'string' ? v.meta.dayKey : '',
          monthKey: typeof v.meta?.monthKey === 'string' ? v.meta.monthKey : '',
        },
      }
    }
    function parseActionResult(v, path) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'object')
      const out = { ok: v.ok === true, message: typeof v.message === 'string' ? v.message : '' }
      if (v.state !== undefined && v.state !== null) out.state = parseState(v.state, path + '.state')
      return out
    }
    function codecOf(parse) {
      return { parse }
    }
    /** 描述符 codec:`mode: 'strict'` + 与 typert.host.js 一致的 typeSymbol。 */
    function strictCodec(typeSymbol, schema) {
      return { mode: 'strict', typeSymbol, schema }
    }

    const stateCodec = strictCodec('dsh-billing#State', codecOf((v) => parseState(v, 'state')))
    const patchCodec = strictCodec('dsh-billing#ConfigPatch', codecOf((v) => {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) fail('patch', 'object')
      return v
    }))
    const actionCodec = strictCodec('dsh-billing#ActionResult', codecOf((v) => parseActionResult(v, 'action')))
    //#endregion

    const CONTRIBUTION = {
      package: "dsh-billing",
      descriptors: [
        {
          id: "dsh-billing#billing/getState", service: "billing", namespace: "billing", method: "getState",
          invocation: { kind: "direct" }, parameters: [],
          result: stateCodec,
        },
        {
          id: "dsh-billing#billing/updateConfig", service: "billing", namespace: "billing", method: "updateConfig",
          invocation: { kind: "direct" },
          parameters: [{ name: "patch", wire: "patch", source: "json", codec: patchCodec }],
          result: stateCodec,
        },
        {
          id: "dsh-billing#billing/refreshBalance", service: "billing", namespace: "billing", method: "refreshBalance",
          invocation: { kind: "direct" }, parameters: [],
          result: actionCodec,
        },
        {
          id: "dsh-billing#billing/fetchPrices", service: "billing", namespace: "billing", method: "fetchPrices",
          invocation: { kind: "direct" }, parameters: [],
          result: actionCodec,
        },
        {
          id: "dsh-billing#billing/resetHistory", service: "billing", namespace: "billing", method: "resetHistory",
          invocation: { kind: "direct" }, parameters: [],
          result: actionCodec,
        },
      ],
    };

    //#region display helpers
    function currencySymbolOf(currency) {
      const symbols = { CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥", HKD: "HK$", TWD: "NT$" };
      return symbols[currency] ?? `${currency} `;
    }
    function formatMoney(value, currency, decimals) {
      const symbol = currencySymbolOf(currency || "CNY");
      const digits = Math.max(0, Math.min(10, Math.floor(Number(decimals) || 2)));
      return `${symbol}${(Math.round(value * 100) / 100).toFixed(digits)}`;
    }
    function formatConfigMoney(usdValue, config) {
      const rate = Number(config?.exchangeRate);
      const value = usdValue * (Number.isFinite(rate) && rate > 0 ? rate : 1);
      const symbol = typeof config?.symbol === "string" && config.symbol.length > 0 ? config.symbol : "$";
      const decimals = Math.max(0, Math.min(10, Math.floor(Number(config?.decimals) || 4)));
      let effective = decimals;
      if (value > 0 && value < Math.pow(10, -decimals)) effective = decimals + 2;
      const fixed = value.toFixed(effective);
      const trimmed = fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
      return symbol + trimmed;
    }
    function formatCost(value, config) {
      return formatConfigMoney(value, config);
    }
    function formatTokens(n) {
      const v = Math.max(0, Number(n) || 0);
      const scaled = (x) => x >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
      if (v < 1000) return String(Math.round(v));
      if (v < 1000000) return scaled(v / 1000) + "K";
      return scaled(v / 1000000) + "M";
    }
    function formatDuration(ms) {
      const s = ms / 1000;
      if (s < 60) return `${Math.round(s * 10) / 10}s`;
      const whole = Math.round(s);
      return `${Math.floor(whole / 60)}m${whole % 60}s`;
    }
    function formatTokensPerSecond(tps) {
      const clamped = Math.max(0, tps);
      return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
    }
    function usageOutputTokens(usage) {
      if (typeof usage !== "object" || usage === null) return null;
      const value = usage.outputTokens;
      return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
    }
    function assistantStepReading(node) {
      const timing = node.timing;
      return {
        ttftMs: timing !== undefined && timing.stepStartTime !== null && timing.firstTokenTime !== null ? Math.max(0, timing.firstTokenTime - timing.stepStartTime) : null,
        decodeMs: timing !== undefined && timing.firstTokenTime !== null ? Math.max(0, timing.completedTime - timing.firstTokenTime) : null,
        outputTokens: usageOutputTokens(node.usage),
      };
    }
    function deriveStats(nodes) {
      const turns = new Set();
      let steps = 0;
      let llmMs = 0;
      let toolMs = 0;
      let ttftMs = 0;
      let ttftSteps = 0;
      let decodeMs = 0;
      let decodeTokens = 0;
      for (const node of nodes) {
        if (node.kind === "tool-result") {
          if (node.callTime !== null) toolMs += Math.max(0, node.time - node.callTime);
          continue;
        }
        if (node.kind !== "assistant") continue;
        turns.add(node.turn);
        steps += 1;
        if (node.timing !== undefined && node.timing.stepStartTime !== null) llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime);
        const reading = assistantStepReading(node);
        if (reading.ttftMs !== null) { ttftMs += reading.ttftMs; ttftSteps += 1; }
        if (reading.decodeMs !== null && reading.outputTokens !== null) { decodeMs += reading.decodeMs; decodeTokens += reading.outputTokens; }
      }
      return { turns: turns.size, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens };
    }
    function billedInputTokens(usage) {
      return (usage?.input ?? 0) + (usage?.cacheRead ?? 0) + (usage?.cacheWrite ?? 0);
    }
    function cacheHitPercent(usage) {
      const denominator = billedInputTokens(usage);
      return denominator === 0 ? null : Math.round(((usage?.cacheRead ?? 0) / denominator) * 100);
    }
    function priceEntryFor(modelId, table) {
      const models = table?.models ?? {};
      if (typeof modelId === "string" && modelId.length > 0 && models[modelId] !== undefined) return models[modelId];
      return table?.default ?? { cacheHit: 0, cacheMiss: 0, output: 0 };
    }
    /** 当前时刻的峰谷档位(与宿主账本口径一致)。 */
    function currentTier(entry, config) {
      const base = entry ?? { cacheHit: 0, cacheMiss: 0, output: 0 };
      if (config?.peakEnabled !== true) return base;
      const effectiveAtMs = Date.parse(config.peakEffectiveAt ?? "");
      const now = Date.now();
      const windows = config.peakWindows ?? [];
      const inPeak = windows.some(w => {
        const hour = new Date(now).getUTCHours();
        const start = Number(w?.start), end = Number(w?.end);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
        if (start < end) return hour >= start && hour < end;
        return hour >= start || hour < end;
      });
      if (inPeak && Number.isFinite(effectiveAtMs) && now >= effectiveAtMs) {
        return entry?.peak ?? base;
      }
      if (!inPeak && Number.isFinite(effectiveAtMs) && now >= effectiveAtMs) {
        return entry?.offPeak ?? base;
      }
      return base;
    }
    function costOfBuckets(buckets, tier) {
      const input = Math.max(0, Number(buckets.input) || 0);
      const output = Math.max(0, Number(buckets.output) || 0);
      const cacheRead = Math.max(0, Number(buckets.cacheRead) || 0);
      const cacheWrite = Math.max(0, Number(buckets.cacheWrite) || 0);
      return (input * tier.cacheMiss + output * tier.output + (cacheRead + cacheWrite) * tier.cacheHit) / 1000000;
    }
    /** costUsage 投影(token 桶 + byModel)→ 美元成本(按当前档位估算)。 */
    function usageCost(usage, config) {
      if (!usage || !config) return 0;
      const byModel = usage.byModel ?? {};
      let total = 0;
      const modeled = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      for (const modelId of Object.keys(byModel)) {
        const entry = priceEntryFor(modelId, config.prices);
        const buckets = byModel[modelId];
        total += costOfBuckets(buckets, currentTier(entry, config));
        modeled.input += buckets.input ?? 0;
        modeled.output += buckets.output ?? 0;
        modeled.cacheRead += buckets.cacheRead ?? 0;
        modeled.cacheWrite += buckets.cacheWrite ?? 0;
      }
      const leftover = {
        input: Math.max(0, (usage.input ?? 0) - modeled.input),
        output: Math.max(0, (usage.output ?? 0) - modeled.output),
        cacheRead: Math.max(0, (usage.cacheRead ?? 0) - modeled.cacheRead),
        cacheWrite: Math.max(0, (usage.cacheWrite ?? 0) - modeled.cacheWrite),
      };
      total += costOfBuckets(leftover, currentTier(priceEntryFor("default", config.prices), config));
      return total;
    }
    function balanceText(balance, config, t) {
      if (balance === undefined || balance === null || typeof balance !== "object") return t("balanceLoading");
      if (balance.status === "ok") {
        const currency = typeof balance.currency === "string" && balance.currency.length > 0 ? balance.currency : (config?.currency ?? "CNY");
        return formatMoney(balance.totalBalance, currency, config?.decimals);
      }
      if (balance.status === "loading") return t("balanceLoading");
      return t("balanceError");
    }
    function shortId(id) {
      return typeof id === "string" && id.length > 0 ? (id.length > 8 ? id.slice(0, 8) : id) : "-";
    }
    function budgetPercent(state, config) {
      if (!state || !config || config.budget?.enabled !== true) return null;
      const rate = Number(config.exchangeRate);
      const used = state.budgetUsed * (Number.isFinite(rate) && rate > 0 ? rate : 1);
      const amount = Number(config.budget.amount);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      return Math.min(999, Math.max(0, (used / amount) * 100));
    }
    //#endregion

    //#region store
    function makeStore(initial) {
      let snapshot = initial;
      const listeners = new Set();
      return {
        getSnapshot: () => snapshot,
        subscribe: (fn) => {
          listeners.add(fn);
          return () => { listeners.delete(fn); };
        },
        set: (next) => {
          if (next === snapshot) return;
          snapshot = next;
          for (const fn of [...listeners]) fn();
        },
      };
    }
    //#endregion

    const { createElement: el, Fragment, useState, useEffect, useMemo, useCallback, useRef } = react;

    //#region WalletIcon (official DeepSeek-style single-color SVG)
    function WalletIcon({ size = 16, className }) {
      return el("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
        el("path", {
          fill: "currentColor",
          d: "M4 4h8a2 2 0 0 1 2 2v5.5A2 2 0 0 1 12 13.5H4A2 2 0 0 1 2 11.5V6a2 2 0 0 1 2-2Zm0 1.5A.5.5 0 0 0 3.5 6v5.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-.5-.5H4Zm8.5 1A1.25 1.25 0 1 1 11.25 7.75 1.25 1.25 0 0 1 12.5 6.5Z",
        }));
    }
    //#endregion

    //#region StatsLine (shadows the stock stats cell)
    const StatsLine = (0, react.memo)(function StatsLine({ useSession, useProjection, t, useCost }) {
      const costStore = useCost ? useCost((s) => s) : undefined;
      const state = costStore?.state;
      const config = state?.config;
      const balance = state?.balance;
      const settledNodes = useSession((s) => s.chat.legacy.nodes);
      const usage = useProjection("costUsage");
      const projected = useProjection("sessionStats");
      const stats = (0, react.useMemo)(() => projected ?? deriveStats(settledNodes), [projected, settledNodes]);
      const groups = [];

      // Balance group.
      if (config?.statsLine !== false) {
        groups.push(t("statsBalance", { amount: balanceText(balance, config, t) }));
      }

      // Today's cost (exact, from the ledger).
      if (state?.today && state.today.cost > 0) {
        groups.push(t("statsToday", { cost: formatConfigMoney(state.today.cost, config) }));
      }

      // This session's tokens + cost (estimated at the current tier).
      if (usage !== undefined && usage !== null && (billedInputTokens(usage) > 0 || (usage.output ?? 0) > 0)) {
        const cost = usageCost(usage, config);
        const totalTokens = billedInputTokens(usage) + (usage.output ?? 0);
        groups.push(t("statsTask", { tokens: formatTokens(totalTokens), cost: formatCost(cost, config) }));
        const cacheHit = cacheHitPercent(usage);
        if (cacheHit !== null) groups.push(t("statsCacheHit", { percent: cacheHit }));
        groups.push(t("statsTokens", { input: formatTokens(billedInputTokens(usage)), output: formatTokens(usage.output ?? 0) }));
      }

      if (stats.steps > 0) {
        groups.push(t("statsCounts", { turns: stats.turns, steps: stats.steps }));
        const durations = [];
        if (stats.llmMs > 0) durations.push(t("statsLlm", { duration: formatDuration(stats.llmMs) }));
        if (stats.toolMs > 0) durations.push(t("statsToolCall", { duration: formatDuration(stats.toolMs) }));
        if (durations.length > 0) groups.push(durations.join(" · "));
        const speeds = [];
        if (stats.ttftSteps > 0) speeds.push(t("statsTtftAverage", { duration: formatDuration(stats.ttftMs / stats.ttftSteps) }));
        if (stats.decodeMs > 0) speeds.push(t("statsTokensPerSecond", { throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1000)) }));
        if (speeds.length > 0) groups.push(speeds.join(" · "));
      }

      const line = groups.join(" | ");
      const rootRef = (0, react.useRef)(null);
      const [truncated, setTruncated] = (0, react.useState)(false);
      (0, react.useLayoutEffect)(() => {
        const elRef = rootRef.current;
        if (elRef === null) return;
        const measure = () => { setTruncated(elRef.scrollWidth > elRef.clientWidth); };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(elRef);
        return () => { observer.disconnect(); };
      }, [line]);
      if (groups.length === 0) return null;
      return el(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
        label: line,
        side: "top",
        delayMs: 500,
        disabled: !truncated,
      }, el("div", { ref: rootRef, className: styles.root, "data-dsh-billing-line": "" },
        groups.map((group, i) => el(react.Fragment, { key: group },
          i > 0 ? el(react.Fragment, null, el("span", { className: styles.sep, "aria-hidden": true }, "|"), " ") : null,
          el("span", null, group)))));
    });
    //#endregion

    //#region SidebarFooter
    function SidebarFooter({ useCost, wide }) {
      const costStore = useCost ? useCost((s) => s) : undefined;
      const state = costStore?.state;
      const config = state?.config;
      const balance = state?.balance;
      const rootRef = useRef(null);
      useEffect(() => {
        const root = rootRef.current;
        const parent = root?.parentElement;
        if (!root || !parent) return;
        if (parent.firstElementChild !== root) parent.insertBefore(root, parent.firstElementChild);
      }, [state]);
      if (!state || config?.sidebar === false) return null;
      const t = makeT(resolveLocale(config?.locale));
      const err = balance?.status === "error";
      const pct = budgetPercent(state, config);
      const fillClass = pct === null ? "" : (pct >= 100 ? " " + styles.over : pct >= 80 ? " " + styles.warn : "");
      const budgetUsedDisplay = formatConfigMoney(state.budgetUsed, config);
      const budgetTotalDisplay = formatConfigMoney(Number(config.budget?.amount) / (Number(config.exchangeRate) > 0 ? Number(config.exchangeRate) : 1), config);
      const subtitleParts = [];
      if (state.today && state.today.cost > 0) subtitleParts.push(`${t("summaryToday")} ${formatConfigMoney(state.today.cost, config)}`);
      if (pct !== null && Number.isFinite(pct)) subtitleParts.push(t("budgetUsedShort", { percent: String(Math.round(pct)) }));
      return el("div", { ref: rootRef, className: styles.sidebar + (err ? " " + styles.err : ""), title: t("balanceTitle"), "data-dsh-billing-sidebar": "" },
        el("div", { className: styles.sidebarRow },
          el(WalletIcon, { size: 14 }),
          el("span", { className: styles.amt }, balanceText(balance, config, t)),
          balance?.status === "ok"
            ? el("span", { className: styles.split },
              `${t("balanceTotal")} ${formatMoney(balance.totalBalance, balance.currency || config?.currency, config?.decimals)}`
              + (balance.grantedBalance > 0 ? ` · ${t("balanceGranted")} ${formatMoney(balance.grantedBalance, balance.currency || config?.currency, config?.decimals)}` : "")
              + (balance.toppedUpBalance > 0 ? ` · ${t("balanceToppedUp")} ${formatMoney(balance.toppedUpBalance, balance.currency || config?.currency, config?.decimals)}` : ""))
            : null),
        subtitleParts.length > 0 ? el("div", { className: styles.today }, subtitleParts.join(" · ")) : null,
        pct !== null && Number.isFinite(pct)
          ? el("div", { className: styles.budgetTrack, title: t("budgetUsed", { amount: budgetUsedDisplay, total: budgetTotalDisplay, percent: String(Math.round(pct)) }) },
            el("div", { className: styles.budgetFill + fillClass, style: { width: Math.min(100, pct) + "%" } }))
          : null);
    }
    //#endregion

    //#region Settings: small field helpers
    function Select({ value, onChange, options, t }) {
      return el("select", { value, onChange: (e) => onChange(e.target.value) },
        options.map((o) => el("option", { key: o.value, value: o.value }, o.label)));
    }
    function NumField({ label, value, onChange, min, max, step }) {
      return el("div", { className: styles.field },
        el("label", null, label),
        el("input", {
          type: "number", min: min, max: max, step: step ?? "any",
          value: value,
          onChange: (e) => {
            const v = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(v)) onChange(v);
          },
        }));
    }
    function ToggleField({ label, value, onChange, onLabel, offLabel }) {
      return el("div", { className: styles.field },
        el("label", null, label),
        el("select", { value: value ? "on" : "off", onChange: (e) => onChange(e.target.value === "on") },
          el("option", { value: "on" }, onLabel ?? "On"),
          el("option", { value: "off" }, offLabel ?? "Off")));
    }
    function TextField({ label, value, onChange }) {
      return el("div", { className: styles.field },
        el("label", null, label),
        el("input", { type: "text", value: value ?? "", onChange: (e) => onChange(e.target.value) }));
    }
    function Card({ label, value, sub }) {
      return el("div", { className: styles.card },
        el("div", { className: styles.cardK }, label),
        el("div", { className: styles.cardV }, value),
        sub ? el("div", { className: styles.cardS }, sub) : null);
    }
    function DayTokensSub(day, t) {
      const input = (day.input ?? 0) + (day.cacheRead ?? 0) + (day.cacheWrite ?? 0);
      return t("summaryTokens", { input: formatTokens(input), output: formatTokens(day.output ?? 0) });
    }
    //#endregion

    //#region CostSection (settings page)
    function CostSection({ useCost }) {
      const costStore = useCost ? useCost((s) => s) : undefined;
      const state = costStore?.state;
      const api = costStore?.api;
      const config = state?.config;
      const balance = state?.balance;
      const [draft, setDraft] = useState(null);
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState(null);
      const [syncMsg, setSyncMsg] = useState(null);
      const [syncBusy, setSyncBusy] = useState(false);
      const [resetBusy, setResetBusy] = useState(false);
      useEffect(() => {
        if (config && draft === null) setDraft(JSON.parse(JSON.stringify(config)));
      }, [config]);
      if (!state || !config) return null;
      const t = makeT(resolveLocale(config?.locale));
      const cur = draft ?? config;
      const setField = (key, value) => setDraft({ ...cur, [key]: value });
      const setNested = (path, value) => {
        if (draft === null) return;
        const next = JSON.parse(JSON.stringify(draft));
        let node = next;
        for (let i = 0; i < path.length - 1; i += 1) {
          if (node[path[i]] === undefined || node[path[i]] === null) node[path[i]] = {};
          node = node[path[i]];
        }
        node[path[path.length - 1]] = value;
        setDraft(next);
      };
      const save = useCallback(async () => {
        if (draft === null) return;
        setBusy(true);
        setMsg(null);
        try {
          await api?.updateConfig(draft);
          setDraft(null);
          setMsg({ kind: "ok", text: t("saved") });
        } catch (error) {
          setMsg({ kind: "err", text: error?.message ?? String(error) });
        } finally {
          setBusy(false);
        }
      }, [draft, api, t]);
      const refresh = useCallback(async () => {
        setBusy(true);
        setMsg(null);
        try {
          const result = await api?.refreshBalance();
          setMsg({ kind: result?.ok ? "ok" : "err", text: result?.message ?? (result?.ok ? t("balanceRefreshed") : t("balanceFailed")) });
        } catch (error) {
          setMsg({ kind: "err", text: error?.message ?? String(error) });
        } finally {
          setBusy(false);
        }
      }, [api, t]);
      const syncPrices = useCallback(async () => {
        setSyncBusy(true);
        setSyncMsg(null);
        try {
          const result = await api?.fetchPrices();
          setSyncMsg({ kind: result?.ok ? "ok" : "err", text: result?.message ?? "" });
        } catch (error) {
          setSyncMsg({ kind: "err", text: error?.message ?? String(error) });
        } finally {
          setSyncBusy(false);
        }
      }, [api]);
      const resetHistory = useCallback(async () => {
        setResetBusy(true);
        setMsg(null);
        try {
          const result = await api?.resetHistory();
          setMsg({ kind: result?.ok ? "ok" : "err", text: result?.message ?? "" });
        } catch (error) {
          setMsg({ kind: "err", text: error?.message ?? String(error) });
        } finally {
          setResetBusy(false);
        }
      }, [api]);

      const balanceVisible = ["both", "settings"].includes(config?.balance?.display);
      const models = cur.prices?.models ?? {};
      const modelIds = Object.keys(models);
      const tierInputs = (entryKey, prefix) => {
        const entry = prefix.length === 0 ? models[curModelId] : (models[curModelId]?.[entryKey] ?? {});
        const set = (field, v) => {
          if (prefix.length === 0) {
            setNested(["prices", "models", curModelId, field], v);
          } else {
            const current = models[curModelId]?.[entryKey] ?? {};
            setNested(["prices", "models", curModelId, entryKey], { ...current, [field]: v });
          }
        };
        return [entry, set];
      };
      let curModelId = "";

      const priceRows = [];
      for (const id of modelIds) {
        curModelId = id;
        const entry = models[id];
        const base = tierInputs("", "");
        const off = tierInputs("offPeak", "offPeak");
        const pk = tierInputs("peak", "peak");
        priceRows.push(el("div", { key: id, className: styles.row + " bl-price-row" },
          el("span", { className: styles.k }, id + (entry.legacy ? " (legacy)" : "")),
          el("div", { style: { display: "flex", gap: 4, alignItems: "center" } },
            el("span", { className: styles.k }, t("priceTierBase")),
            el("input", { type: "number", step: "any", min: 0, value: base[0].cacheMiss, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) base[1]("cacheMiss", v); } }),
            el("input", { type: "number", step: "any", min: 0, value: base[0].cacheHit, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) base[1]("cacheHit", v); } }),
            el("input", { type: "number", step: "any", min: 0, value: base[0].output, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) base[1]("output", v); } }))));
        priceRows.push(el("div", { key: id + "-tiers", className: styles.row },
          el("span", { className: styles.k }, ""),
          el("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } },
            el("span", { className: styles.tierK }, t("priceTierOffPeak")),
            el("input", { type: "number", step: "any", min: 0, value: off[0]?.cacheMiss ?? 0, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) off[1]("cacheMiss", v); } }),
            el("input", { type: "number", step: "any", min: 0, value: off[0]?.cacheHit ?? 0, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) off[1]("cacheHit", v); } }),
            el("input", { type: "number", step: "any", min: 0, value: off[0]?.output ?? 0, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) off[1]("output", v); } }),
            el("span", { className: styles.tierK }, t("priceTierPeak")),
            el("input", { type: "number", step: "any", min: 0, value: pk[0]?.cacheMiss ?? 0, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) pk[1]("cacheMiss", v); } }),
            el("input", { type: "number", step: "any", min: 0, value: pk[0]?.cacheHit ?? 0, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) pk[1]("cacheHit", v); } }),
            el("input", { type: "number", step: "any", min: 0, value: pk[0]?.output ?? 0, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) pk[1]("output", v); } }))));
      }
      const def = cur.prices?.default ?? { cacheHit: 0.0028, cacheMiss: 0.14, output: 0.28 };
      priceRows.push(el("div", { key: "__default__", className: styles.row },
        el("span", { className: styles.k }, t("priceDefault")),
        el("div", { style: { display: "flex", gap: 4, alignItems: "center" } },
          el("span", { className: styles.k }, t("priceTierBase")),
          el("input", { type: "number", step: "any", min: 0, value: def.cacheMiss, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setNested(["prices", "default", "cacheMiss"], v); } }),
          el("input", { type: "number", step: "any", min: 0, value: def.cacheHit, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setNested(["prices", "default", "cacheHit"], v); } }),
          el("input", { type: "number", step: "any", min: 0, value: def.output, onChange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setNested(["prices", "default", "output"], v); } }))));

      const budget = cur.budget ?? {};
      const pct = budgetPercent(state, config);
      const sessionRows = (state.today?.sessions ?? []).map((s) => el("tr", { key: s.id },
        el("td", { className: "bl-sid", title: s.id }, shortId(s.id)),
        el("td", { className: "bl-num" }, String(s.calls)),
        el("td", { className: "bl-num" }, formatTokens((s.input ?? 0) + (s.cacheRead ?? 0) + (s.cacheWrite ?? 0))),
        el("td", { className: "bl-num" }, formatTokens(s.output ?? 0)),
        el("td", { className: "bl-num bl-cost" }, formatConfigMoney(s.cost, config))));
      const historyRows = state.history.map((d) => el("tr", { key: d.date },
        el("td", null, d.date),
        el("td", { className: "bl-num" }, String(d.calls)),
        el("td", { className: "bl-num" }, formatTokens((d.input ?? 0) + (d.cacheRead ?? 0) + (d.cacheWrite ?? 0))),
        el("td", { className: "bl-num" }, formatTokens(d.output ?? 0)),
        el("td", { className: "bl-num bl-cost" }, formatConfigMoney(d.cost, config))));

      const budgetPeriodOptions = [
        { value: "day", label: t("budgetPeriodDay") },
        { value: "month", label: t("budgetPeriodMonth") },
        { value: "all", label: t("budgetPeriodAll") },
        { value: "custom", label: t("budgetPeriodCustom") },
      ];
      const balanceDisplayOptions = [
        { value: "sidebar", label: t("fieldBalanceDisplaySidebar") },
        { value: "settings", label: t("fieldBalanceDisplaySettings") },
        { value: "both", label: t("fieldBalanceDisplayBoth") },
        { value: "off", label: t("fieldBalanceDisplayOff") },
      ];
      const localeOptions = [
        { value: "auto", label: t("fieldLocaleAuto") },
        { value: "zh", label: t("fieldLocaleZh") },
        { value: "en", label: t("fieldLocaleEn") },
      ];

      return el("div", { className: styles.section },
        // 余额
        el("h3", null, t("balanceTitle")),
        el("div", { className: styles.field },
          el("div", { className: styles.row },
            el("span", { className: styles.k }, balanceText(balance, config, t)),
            el("button", { className: styles.btn, onClick: refresh, disabled: busy }, t("balanceRefresh")))),
        balance?.status === "ok"
          ? el("div", null,
            el("div", { className: styles.row }, el("span", { className: styles.k }, t("balanceTotal")), el("span", { className: styles.v }, formatMoney(balance.totalBalance, balance.currency || config.currency, config.decimals))),
            el("div", { className: styles.row }, el("span", { className: styles.k }, t("balanceGranted")), el("span", { className: styles.v }, formatMoney(balance.grantedBalance, balance.currency || config.currency, config.decimals))),
            el("div", { className: styles.row }, el("span", { className: styles.k }, t("balanceToppedUp")), el("span", { className: styles.v }, formatMoney(balance.toppedUpBalance, balance.currency || config.currency, config.decimals))))
          : null,
        // 汇总卡片
        el("h3", null, t("summaryTitle")),
        el("div", { className: styles.grid },
          Card({ label: t("summaryToday"), value: formatConfigMoney(state.today?.cost ?? 0, config), sub: t("summaryCalls", { calls: state.today?.calls ?? 0 }) + " · " + DayTokensSub(state.today ?? {}, t) }),
          Card({ label: t("summaryMonth"), value: formatConfigMoney(state.month?.cost ?? 0, config), sub: t("summaryCalls", { calls: state.month?.calls ?? 0 }) + " · " + DayTokensSub(state.month ?? {}, t) }),
          Card({ label: t("summaryTotal"), value: formatConfigMoney(state.total?.cost ?? 0, config), sub: t("summaryCalls", { calls: state.total?.calls ?? 0 }) + " · " + DayTokensSub(state.total ?? {}, t) })),
        // 预算
        el("h3", null, t("budgetTitle")),
        ToggleField({ label: t("budgetEnabled"), value: budget.enabled, onChange: (v) => setNested(["budget", "enabled"], v) }),
        pct !== null && Number.isFinite(pct)
          ? el("div", { className: styles.row }, el("span", { className: styles.k }, t("budgetUsed", {
            amount: formatConfigMoney(state.budgetUsed, config),
            total: formatConfigMoney(Number(config.budget.amount) / (Number(config.exchangeRate) > 0 ? Number(config.exchangeRate) : 1), config),
            percent: String(Math.round(pct)),
          })), null)
          : null,
        NumField({ label: t("budgetAmount"), value: budget.amount, onChange: (v) => setNested(["budget", "amount"], v), min: 0 }),
        el("div", { className: styles.field },
          el("label", null, t("budgetPeriod")),
          Select({ value: budget.period, onChange: (v) => setNested(["budget", "period"], v), options: budgetPeriodOptions, t })),
        budget.period === "custom"
          ? el("div", { className: styles.grid },
            el("div", { className: styles.field },
              el("label", null, t("budgetCustomStart")),
              el("input", { type: "date", value: budget.customStart ?? "", onChange: (e) => setNested(["budget", "customStart"], e.target.value || null) })),
            el("div", { className: styles.field },
              el("label", null, t("budgetCustomEnd")),
              el("input", { type: "date", value: budget.customEnd ?? "", onChange: (e) => setNested(["budget", "customEnd"], e.target.value || null) })))
          : null,
        // 今日会话明细
        el("h3", null, t("sessionsTitle")),
        sessionRows.length > 0
          ? el("table", { className: styles.table },
            el("thead", null, el("tr", null,
              el("th", null, t("sessionCol")), el("th", null, t("callsCol")), el("th", null, t("inputCol")), el("th", null, t("outputCol")), el("th", null, t("costCol")))),
            el("tbody", null, sessionRows))
          : el("p", { className: styles.note }, t("historyEmpty")),
        // 历史记录
        el("h3", null, t("historyTitle")),
        historyRows.length > 0
          ? el("table", { className: styles.table },
            el("thead", null, el("tr", null,
              el("th", null, t("dateCol")), el("th", null, t("callsCol")), el("th", null, t("tokensCol")), el("th", null, t("outputCol")), el("th", null, t("costCol")))),
            el("tbody", null, historyRows))
          : el("p", { className: styles.note }, t("historyEmpty")),
        // 价格表
        el("h3", null, t("priceTitle")),
        el("div", { className: styles.actions },
          el("button", { className: styles.btn, onClick: syncPrices, disabled: syncBusy }, syncBusy ? t("priceSyncing") : t("priceSync")),
          el("span", { className: styles.note }, t("priceSource", { source: cur.priceSource === "official" ? t("priceSourceOfficial") : t("priceSourceBundled") })
            + (cur.fetchedAt ? " · " + t("fetchedAt", { time: new Date(cur.fetchedAt).toLocaleString() }) : ""))),
        syncMsg !== null ? el("div", { className: "bl-msg " + (syncMsg.kind === "err" ? styles.err : styles.ok) }, syncMsg.text) : null,
        priceRows,
        ToggleField({ label: t("pricePeakEnabled"), value: cur.peakEnabled, onChange: (v) => setField("peakEnabled", v) }),
        TextField({ label: t("pricePeakEffectiveAt"), value: cur.peakEffectiveAt, onChange: (v) => setField("peakEffectiveAt", v) }),
        TextField({ label: t("pricePeakWindows"), value: JSON.stringify(cur.peakWindows ?? []), onChange: (v) => { try { const parsed = JSON.parse(v); if (Array.isArray(parsed)) setField("peakWindows", parsed); } catch { /* keep last valid */ } } }),
        // 显示设置
        el("h3", null, t("displayTitle")),
        el("div", { className: styles.field },
          el("label", null, t("fieldLocale")),
          Select({ value: cur.locale, onChange: (v) => setField("locale", v), options: localeOptions, t })),
        ToggleField({ label: t("fieldStatsLine"), value: cur.statsLine, onChange: (v) => setField("statsLine", v) }),
        ToggleField({ label: t("fieldSidebar"), value: cur.sidebar, onChange: (v) => setField("sidebar", v) }),
        el("div", { className: styles.field },
          el("label", null, t("fieldBalanceDisplay")),
          Select({ value: cur.balance?.display ?? "both", onChange: (v) => setNested(["balance", "display"], v), options: balanceDisplayOptions, t })),
        el("div", { className: styles.field },
          el("label", null, t("fieldCurrency")),
          el("select", { value: cur.currency, onChange: (e) => setField("currency", e.target.value) },
            ["CNY", "USD", "EUR", "GBP", "JPY", "HKD", "TWD"].map((c) => el("option", { key: c, value: c }, c)))),
        TextField({ label: t("fieldSymbol"), value: cur.symbol, onChange: (v) => setField("symbol", v) }),
        NumField({ label: t("fieldDecimals"), value: cur.decimals, onChange: (v) => setField("decimals", v), min: 0, max: 10, step: 1 }),
        NumField({ label: t("fieldExchangeRate"), value: cur.exchangeRate, onChange: (v) => setField("exchangeRate", v), min: 0.0001, step: 0.1 }),
        NumField({ label: t("fieldRefresh"), value: cur.balance?.refreshMinutes ?? 5, onChange: (v) => setNested(["balance", "refreshMinutes"], v), min: 1, max: 1440, step: 1 }),
        NumField({ label: t("fieldHistoryDays"), value: cur.historyDays, onChange: (v) => setField("historyDays", v), min: 7, max: 3650, step: 1 }),
        // 数据
        el("h3", null, t("dataTitle")),
        el("div", { className: styles.actions },
          el("button", { className: styles.btn, onClick: resetHistory, disabled: resetBusy }, resetBusy ? t("dataResetting") : t("dataReset"))),
        el("hr", { className: styles.hr }),
        el("div", { className: styles.field },
          el("button", { className: styles.btn, onClick: save, disabled: busy || draft === null }, busy ? t("saving") : t("saveLabel"))),
        msg !== null ? el("div", { className: "bl-msg " + (msg.kind === "err" ? styles.err : styles.ok) }, msg.text) : null,
        el("p", { className: styles.note }, t("sectionNote")));
    }
    //#endregion

    //#region plugin body
    const inject = ["slots", "locale", "remote"];

    async function apply(ctx) {
      const remote = ctx.remote;
      if (remote === undefined || typeof remote.$mount !== "function") return;
      const unmount = await remote.$mount(CONTRIBUTION);
      ctx.effect(() => () => { unmount(); }, "dsh-billing: remote contribution");
      const billing = ctx.get("remote.billing");
      if (billing === undefined) return;
      const store = makeStore({ status: "loading", error: null, state: null });
      const rpcT = () => makeT(resolveLocale(store.getSnapshot().state?.config?.locale));

      const call = async (method, args) => {
        const result = await billing[method](...(args ?? []));
        if (result === null || typeof result !== "object" || result.ok !== true) {
          throw new Error(result?.error?.message ?? rpcT()("rpcFailed", { method }));
        }
        return result.value;
      };
      let reloading = false;
      const reload = async () => {
        if (reloading) return;
        reloading = true;
        const prev = store.getSnapshot();
        try {
          const state = await call("getState");
          store.set({ status: "ready", error: null, state });
          if (state?.config?.locale === "auto") {
            const resolved = resolveLocale("auto");
            if (resolved !== "zh") void api.updateConfig({ locale: resolved }).catch(() => {});
          }
        } catch (error) {
          store.set({ status: "error", error: error?.message ?? String(error), state: prev.state });
        } finally {
          reloading = false;
        }
      };
      ctx.effect(() => ctx.on("connection/reset", () => { void reload(); }), "dsh-billing: reconnect reload");
      const pollTimer = setInterval(() => { if (!document.hidden) void reload(); }, 60_000);
      ctx.effect(() => () => { clearInterval(pollTimer); }, "dsh-billing: poll timer");
      const onVisible = () => { if (document.visibilityState === "visible") void reload(); };
      document.addEventListener("visibilitychange", onVisible);
      ctx.effect(() => () => { document.removeEventListener("visibilitychange", onVisible); }, "dsh-billing: visibility reload");

      const api = {
        reload,
        updateConfig: async (patch) => {
          const state = await call("updateConfig", [patch]);
          store.set({ status: "ready", error: null, state });
          return state;
        },
        refreshBalance: async () => {
          const result = await billing.refreshBalance();
          if (result === null || typeof result !== "object" || result.ok !== true) {
            throw new Error(result?.error?.message ?? rpcT()("rpcBalanceFailed"));
          }
          if (result.value.state !== undefined) store.set({ status: "ready", error: null, state: result.value.state });
          return result.value;
        },
        fetchPrices: async () => {
          const result = await billing.fetchPrices();
          if (result === null || typeof result !== "object" || result.ok !== true) {
            throw new Error(result?.error?.message ?? rpcT()("rpcFailed", { method: "fetchPrices" }));
          }
          if (result.value.state !== undefined) store.set({ status: "ready", error: null, state: result.value.state });
          return result.value;
        },
        resetHistory: async () => {
          const result = await billing.resetHistory();
          if (result === null || typeof result !== "object" || result.ok !== true) {
            throw new Error(result?.error?.message ?? rpcT()("rpcFailed", { method: "resetHistory" }));
          }
          if (result.value.state !== undefined) store.set({ status: "ready", error: null, state: result.value.state });
          return result.value;
        },
      };

      void reload();

      const slots = ctx.get("slots");
      if (slots === undefined) return;
      const injected = () => ({ hooks: { cost: store }, api });

      // Stats cell: shadow the stock StatsLine (same id, lower priority).
      ctx.effect(() => ctx.locale.register("dsh-billing", MESSAGES), "dsh-billing: dictionaries");
      const statsActive = { gen: 0, dispose: null };
      const registerStats = (enabled) => {
        if (statsActive.dispose !== null) { statsActive.dispose(); statsActive.dispose = null; }
        statsActive.gen += 1;
        const gen = statsActive.gen;
        if (!enabled) return;
        slots.inject("conversation.composer.dock", () => {
          if (statsActive.gen !== gen) return;
          const dispose = slots.register({
            name: "conversation.composer.dock",
            id: "stats",
            order: 0,
            priority: -1,
            locale: "dsh-billing",
            inject: injected,
          }, StatsLine);
          if (statsActive.gen !== gen) { dispose(); return; }
          statsActive.dispose = dispose;
          return () => {
            if (statsActive.dispose === dispose) statsActive.dispose = null;
            dispose();
          };
        });
      };
      const footerActive = { gen: 0, dispose: null };
      const registerFooter = (enabled) => {
        if (footerActive.dispose !== null) { footerActive.dispose(); footerActive.dispose = null; }
        footerActive.gen += 1;
        const gen = footerActive.gen;
        if (!enabled) return;
        slots.inject("sidebar.footer.action", () => {
          if (footerActive.gen !== gen) return;
          const dispose = slots.register({ name: "sidebar.footer.action", id: "dsh-billing", order: 0, inject: injected }, SidebarFooter);
          if (footerActive.gen !== gen) { dispose(); return; }
          footerActive.dispose = dispose;
          return () => {
            if (footerActive.dispose === dispose) footerActive.dispose = null;
            dispose();
          };
        });
      };
      const sectionActive = { gen: 0, dispose: null };
      const registerSection = (locale) => {
        if (sectionActive.dispose !== null) { sectionActive.dispose(); sectionActive.dispose = null; }
        sectionActive.gen += 1;
        const gen = sectionActive.gen;
        slots.inject("settings.section", () => {
          if (sectionActive.gen !== gen) return;
          const dispose = slots.register({
            name: "settings.section",
            id: "dsh-billing",
            order: 30,
            label: locale === "en" ? MESSAGES.en.sectionLabel : MESSAGES.zh.sectionLabel,
            inject: injected,
          }, CostSection);
          if (sectionActive.gen !== gen) { dispose(); return; }
          sectionActive.dispose = dispose;
          return () => {
            if (sectionActive.dispose === dispose) sectionActive.dispose = null;
            dispose();
          };
        });
      };

      let lastStats = null;
      let lastFooter = null;
      let lastSectionLocale = null;
      const sync = () => {
        const state = store.getSnapshot().state;
        const statsOn = state?.config?.statsLine !== false;
        const footerOn = state?.config?.sidebar !== false;
        const sectionLocale = resolveLocale(state?.config?.locale);
        if (statsOn !== lastStats) { registerStats(statsOn); lastStats = statsOn; }
        if (footerOn !== lastFooter) { registerFooter(footerOn); lastFooter = footerOn; }
        if (sectionLocale !== lastSectionLocale) { registerSection(sectionLocale); lastSectionLocale = sectionLocale; }
      };
      sync();
      const stopSync = store.subscribe(sync);

      return () => { stopSync(); };
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
