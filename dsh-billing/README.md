# dsh-billing

**DeepSeek Harness 计费插件**(界面中英双语)

持久化账本 · 精确计费(每次模型调用)· 官方余额 · 预算 · 今日/本月/累计汇总 · 会话明细与历史记录 · 峰谷计价 · 官方价格同步

[![version](https://img.shields.io/badge/version-1.0.0-4176E6)](package.json)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![dsh](https://img.shields.io/badge/DeepSeek%20Harness-dsh--plugin-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.en.md) | **中文**

---

## 功能总览

| 功能 | 位置 | 说明 |
|---|---|---|
| 本会话费用 | 会话统计行 | 实时累计 token(输入/缓存/输出)+ 按当前价格档位估算费用 |
| 今日费用 | 会话统计行 / 侧边栏 | 账本精确值 |
| 官方余额 | 会话统计行 / 侧边栏底部 / 设置页 | 总/赠送/充值,自动刷新 + 手动刷新 |
| 汇总卡片 | 设置页 | 今日 / 本月 / 累计费用、调用次数与 token 明细 |
| 预算 | 设置页 + 侧边栏进度条 | 额度、周期(今日/本月/累计/自定义区间)、已用百分比(≥80% 预警、≥100% 超支) |
| 今日会话明细 | 设置页 | 每个会话的调用次数、输入/缓存/输出 token 与费用 |
| 历史记录 | 设置页 | 按天汇总,保留天数可配(默认 180 天) |
| 价格表 | 设置页 | 每模型 基础/谷时/峰时 三档价格,可编辑 |
| 峰谷计价 | 设置页 | DeepSeek 官方峰谷方案,生效时间门控 |
| 官方价格同步 | 设置页 | 抓取解析官方定价页,一键应用 |
| 数据 | 设置页 | 清除全部历史 |
| 界面语言 | 设置页 → 显示设置 | 简体中文 / English / 跟随浏览器(auto,默认) |

## 计费规则

- 价格单位与官方文档一致:**美元 / 1M tokens**;
- 成本 = 未命中输入 × `cacheMiss` + 输出 × `output` + (缓存读 + 缓存写) × `cacheHit`;
- **峰谷计价按时点门控**:`peakEffectiveAt`(默认 2026-08-16 16:00 UTC)之前一律按基础价格;之后峰时段(01:00–04:00、06:00–10:00 UTC)按峰时价、其余按谷时价;
- 账本金额恒以**美元**存储,币种/汇率仅影响显示(默认 1 USD = 7.2 CNY,可改);
- **计费来源为每次模型调用的 usage 块**(`llm/stream` 瀑布链尾监听),主循环、子代理、压缩、标题等辅助调用全部入账,与账单口径一致;
- 会话统计行的本会话费用按当前价格档位**估算**,今日/月度/累计与预算为按调用实际时刻**精确计费**;
- 预算与超支提示**仅提醒,不阻止调用**。


## 数据存储

- 账本:`$DSH_HOME/storages/dsh-billing/ledger.json`(原子写入 + 2 秒防抖;按 `historyDays` 保留,每日最多 200 个会话明细);
- 所有设置修改**即时自动保存**(客户端「保存设置」提交,服务端校验后持久化);
- 删除账本文件即可清零,或使用设置页「清除全部历史」。

## 架构

```
dsh-billing
├── cordis.patch.yml        # bundle 补丁:向 web profile 插入 billing 行
├── package.json            # dsh.bundle 补丁声明 + dsh.client 浏览器声明
├── lib/
│   ├── index.js            # 宿主插件:llm/stream 计费包裹、costUsage 会话投影、
│   │                       #   billing 服务(手写 typertRemote 绑定)、余额查询、官方价格同步
│   ├── pricing.js          # 官方价格表、官方页面 HTML 解析、峰谷计费数学
│   ├── store.js            # 账本持久化与配置管理($DSH_HOME/storages/dsh-billing)
│   ├── typert.host.js      # ./typert 导出:Typert 清单(typert-loader 自动注册)
│   └── client.js           # ./client 导出:浏览器单文件 bundle(统计行/侧边栏/设置页)
└── test/
    ├── verify.mjs          # 单元验证:定价/配置/账本/投影/真实 cordis 加载/计费包裹
    └── demo.mjs            # 计费演示:模拟多会话/多模型/峰谷调用,输出账本与汇总
```

数据通道:

- **本会话费用**:宿主注册 `costUsage` 会话投影(纯 token 桶 + 按模型拆分),浏览器经 `useProjection('costUsage')` 读取并按当前价格档位计价;
- **账本 / 预算 / 余额 / 配置**:`billing/getState | updateConfig | refreshBalance | fetchPrices | resetHistory`,经 Typert 网关 RPC(`remote.billing.*`);
- **余额**:调用官方 `GET {baseURL}/user/balance`,复用模型请求的同一把 API Key(凭证服务/环境变量),进程内缓存按 `refreshMinutes` 过期;
- **刷新策略**:宿主**不使用 cordis timer mixin**(`ctx.interval` 在未挂载 timer 服务的上下文中读取会直接抛错),全部基于「缓存时间戳 + 按需刷新」,由客户端轮询/手动刷新触发。

插件不导入 cordis/dsh 的 Service/Context 运行时类(仅 Node 内建模块、zod、dsh-home-paths、dsh-credentials 的纯函数),与宿主共享同一运行时实例,无重复依赖风险。

## 安装

> 需求:Node.js ≥ 20 + DeepSeek Harness(带 `dsh plugin` 命令,`npm install -g @deepseek-ai/dsh`)。

### 方式一:从 GitHub 安装(发布后)



```sh
dsh plugin --profile web add github:mahiro6/dsh-billing
```

或使用 GitHub tag 打包直链:

```sh
dsh plugin --profile web add https://github.com/mahiro6/dsh-billing/archive/refs/heads/main.tar.gz
```

### 方式二:本地开发安装(推荐改源码时用)

```sh
dsh plugin --profile web add link:<本仓库绝对路径>
# 例:dsh plugin --profile web add link:E:\Workspace\dsh-billing
```

### 生效与卸载

安装后**重启** `dsh web`(插件行、Typert 清单与客户端 bundle 均在启动时扫描):

```sh
dsh web
```

更新:重跑安装命令并重启;卸载:`dsh plugin --profile web remove dsh-billing`。

## 开发与验证

```sh
pnpm install                                            # 依赖
node --check lib/index.js && node --check lib/pricing.js \
  && node --check lib/store.js && node --check lib/typert.host.js \
  && node --check lib/client.js                         # 语法检查
node test/verify.mjs                                    # 单元验证(定价/配置/账本/投影/真实 cordis 加载/计费包裹)
node test/demo.mjs                                      # 计费演示(模拟调用 → 账本/汇总/预算)
dsh --profile web --dump-config                         # 组合树校验(需已安装)
```

## 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `locale` | `auto` | 界面语言:auto(跟随浏览器)/ zh / en |
| `statsLine` | `true` | 会话统计行显示余额、今日费用与本会话费用 |
| `sidebar` | `true` | 侧边栏底部显示余额、今日费用与预算进度条 |
| `currency` | `CNY` | 费用显示币种(CNY/USD/EUR/GBP/JPY/HKD/TWD) |
| `symbol` | `¥` | 货币符号 |
| `decimals` | `4` | 金额小数位 |
| `exchangeRate` | `7.2` | 汇率(1 USD = ?) |
| `peakEnabled` | `true` | 启用峰谷计价 |
| `peakEffectiveAt` | `2026-08-16T16:00:00Z` | 峰谷计价生效时间(UTC) |
| `peakWindows` | `[{1,4},{6,10}]` | 峰时段窗口(UTC 小时) |
| `prices` | 内置 DeepSeek 官方价 | 每模型 `cacheHit/cacheMiss/output` + 可选 `offPeak/peak`(美元 / 1M tokens) |
| `budget` | `{enabled:false, amount:100, period:'month'}` | 预算:启用/额度(显示币种)/周期(day/month/all/custom)/自定义区间 |
| `balance` | `{display:'both', refreshMinutes:5}` | 余额显示位置与自动刷新间隔 |
| `historyDays` | `180` | 账本保留天数(7–3650) |

## 已知限制

- 余额是账户级数据,按 `refreshMinutes` 缓存;手动刷新即时生效;
- 会话统计行的本会话费用为当前档位估算值,精确费用以账本(今日/月度/累计)为准;
- 官方页面解析依赖当前页面结构;改版后「同步官方价格」会报错,可手动编辑价格表兜底;
- 价格同步会覆盖官方页面列出的同名模型价格,自定义模型条目不受影响;
- 余额查询需要可访问 api.deepseek.com 的网络与有效 API Key;**API Key 只会发往官方域名**(baseURL 指向非官方域名时余额查询拒绝请求,模型请求不受影响);
- 安装/更新插件后需重启 `dsh web` 生效。

## 贡献

欢迎提交 Issue 与 PR。开发前请先跑通 `node test/verify.mjs`。

## License

[MIT](LICENSE) © 2026 dsh-billing contributors
