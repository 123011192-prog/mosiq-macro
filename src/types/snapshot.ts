/** MOSIQ 全球宏观罗盘 · 快照数据契约
 * 与 macro-risk-system 仓库 outputs/snapshot.json 对齐。
 */
export type Light = 'green' | 'yellow' | 'orange' | 'red' | 'unknown'

export interface CoreSignals {
  baa10y: number | null
  baa10y_pct: number | null
  curve_10y3m: number | null
  curve_inverted: boolean | null
}

export interface CycleState {
  growth?: string
  inflation?: string
  liquidity?: string
  credit?: string
  policy?: string
  market_stress?: string
}

export interface Confirmation {
  label: string
  active: boolean
}

export interface Advice {
  text: string
  confidence?: string
}

export interface Health {
  data_asof?: string
  stale_count?: number
  degraded?: string[]
}

/** 区域（非美国）周期五维方向。 */
export type RegionCycleDirection = 'up' | 'neutral' | 'down' | 'degraded'

/** 区域关键指标读数。signal 语义：
 * growth=3m_change、policy=6m_change_pp（正值=收紧）、credit=4q_change_pp、
 * market=drawdown_pct、fx=3m_change_pct（负值=贬值压力）。 */
export interface RegionIndicator {
  id: string
  name: string
  value: number | null
  date: string
  unit?: string
  signal?: Record<string, number>
}

export interface RegionSnapshot {
  status: 'ok' | 'degraded' | 'unknown'
  cycle: {
    growth?: RegionCycleDirection
    policy?: RegionCycleDirection
    credit?: RegionCycleDirection
    market?: RegionCycleDirection
    fx?: RegionCycleDirection
  }
  indicators: RegionIndicator[]
  light: Light
  summary?: string
  degraded?: string[]
}

/** 行情来源标签：yahoo_gw=Yahoo网关（不经限流）、yahoo_direct=Yahoo直连、
 * local_cache=本地缓存、fred=FRED 官方日频。 */
export type QuoteSource =
  | 'yahoo_gw'
  | 'yahoo_direct'
  | 'local_cache'
  | 'fred'
  | 'tushare'

/** 油价观察：WTI / 布伦特读数与涨跌幅。
 * inflation_evidence 仅作证据记录，不参与六维判定。 */
export interface OilQuote {
  value: number | null
  date?: string
  change_20d_pct?: number | null
  change_3m_pct?: number | null
  source?: QuoteSource
}

export interface OilWatch {
  wti?: OilQuote
  brent?: OilQuote
  inflation_evidence?: {
    rule?: string
    active?: boolean
    wti_change_3m_pct?: number | null
    brent_change_3m_pct?: number | null
    note?: string
  }
}

/** 美债收益率观察：10Y / 30Y / 2Y 读数、20 交易日 bp 变化与 2s10s 利差。
 * long_end_selloff 仅作证据记录，不参与灯号判定。 */
export interface RateQuote {
  value: number | null
  date?: string | null
  change_20d_bp?: number | null
  source?: QuoteSource
}

/** 最新收盘补充：优先 Tushare 美债官方曲线（全期限同源同日），
 * 其次 agent-gw Yahoo；取不到为 null，FRED 仍为主源。 */
export interface LatestQuote {
  value: number | null
  date?: string | null
  source?: QuoteSource
}

export interface RatesWatch {
  us10y?: RateQuote
  us30y?: RateQuote
  us02y?: RateQuote
  spread_2s10s?: {
    value_bp?: number | null
    date?: string | null
  }
  long_end_selloff?: {
    rule?: string
    active?: boolean
    us10y_change_20d_bp?: number | null
    us30y_change_20d_bp?: number | null
    note?: string
  }
  geopolitical_note?: string
  /** Yahoo 网关当日收盘补充：有值时主显，FRED 值作副标。 */
  latest_quotes?: {
    us10y?: LatestQuote | null
    us30y?: LatestQuote | null
  }
}

/** 黄金价格观察：现货读数（美元/盎司）、20 日与约 3 个月涨跌幅。
 * risk_off_signal 仅作证据记录，不参与灯号判定与确认项计数。
 * 数据源 Yahoo 限流时沿用本地缓存，date 可能滞后数天，如实展示。 */
export interface GoldQuote {
  value: number | null
  date?: string | null
  change_20d_pct?: number | null
  change_3m_pct?: number | null
  source?: QuoteSource
}

export interface GoldWatch {
  spot?: GoldQuote
  risk_off_signal?: {
    rule?: string
    active?: boolean
    change_20d_pct?: number | null
    note?: string
  }
  note?: string
}

/** 今日世界简报：GDELT / Google News 抓取的全球宏观·地缘大事（纯展示，
 * 不参与灯号与确认项）。双源都失败时为 null，页面整块隐藏。 */
export interface WorldBriefItem {
  category: string
  title: string
  source: string
  url: string
  published: string
}

export interface Snapshot {
  as_of: string
  global_light: Light
  lights?: {
    banking?: string
    credit?: string
    nonbank?: string
    liquidity?: string
  }
  core?: CoreSignals
  cycle?: CycleState
  confirmations?: Confirmation[]
  founder_note?: string
  advice?: Advice[]
  health?: Health
  /** 美国以外的区域风险面板（欧元区 / 中国 / 日本 / 韩国）。 */
  regions?: Record<string, RegionSnapshot>
  /** 油价观察（WTI / 布伦特 + 通胀辅助证据）。 */
  oil_watch?: OilWatch
  /** 美债收益率观察（10Y / 30Y / 2Y + 2s10s 利差 + 长端异动标记）。 */
  rates_watch?: RatesWatch
  /** 黄金价格观察（现货 + 20日/3个月涨幅 + 避险升温标记）。 */
  gold_watch?: GoldWatch
  /** 今日世界简报（最多 3 条，纯展示；null 时页面隐藏该区域）。 */
  world_brief?: WorldBriefItem[] | null
  news_link?: string
}

/** worldmonitor 简报占位契约（预留）。
 * 拿到 worldmonitor API key 后，由每日任务把金融版 AI 简报写入
 * public/data/briefs.json，页面自动展示；文件缺失时该区域自动隐藏。
 */
export interface Brief {
  title: string
  summary: string
  source?: string
  url?: string
  published_at?: string
}

export interface BriefsFile {
  as_of?: string
  items: Brief[]
}
