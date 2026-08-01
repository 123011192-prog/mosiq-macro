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

/** 油价观察：WTI / 布伦特读数与涨跌幅。
 * inflation_evidence 仅作证据记录，不参与六维判定。 */
export interface OilQuote {
  value: number | null
  date?: string
  change_20d_pct?: number | null
  change_3m_pct?: number | null
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
