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
