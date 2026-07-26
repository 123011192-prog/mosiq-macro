import type { Light } from '../types/snapshot'

/** 把任意字符串收敛为合法灯号。 */
export function asLight(value: string | undefined): Light {
  return value === 'green' || value === 'yellow' || value === 'orange' || value === 'red'
    ? value
    : 'unknown'
}

export const LIGHT_SHORT: Record<Light, string> = {
  green: '绿',
  yellow: '黄',
  orange: '橙',
  red: '红',
  unknown: '—',
}

/* ── 全球区域面板（美国以外） ── */
export const REGION_ORDER = ['euro_area', 'china', 'japan', 'korea'] as const
export const REGION_NAMES: Record<string, string> = {
  euro_area: '欧元区',
  china: '中国',
  japan: '日本',
  korea: '韩国',
}
/** 区域在点阵世界地图上的标记位置（经度, 纬度）。 */
export const REGION_GEO: Record<string, [number, number]> = {
  euro_area: [10, 50],
  china: [104, 34],
  japan: [139.5, 36.5],
  korea: [127.5, 38.5],
}
export const REGION_CYCLE_KEYS = ['growth', 'policy', 'credit', 'market', 'fx'] as const
export const REGION_CYCLE_LABELS: Record<(typeof REGION_CYCLE_KEYS)[number], string> = {
  growth: '增长',
  policy: '政策',
  credit: '信贷',
  market: '市场',
  fx: '汇率',
}
export const DIR_TXT: Record<string, string> = {
  up: '上行',
  neutral: '中性',
  down: '下行',
  degraded: '数据降级',
}
export const DIR_ARROW: Record<string, string> = {
  up: '↑',
  neutral: '→',
  down: '↓',
  degraded: '—',
}
