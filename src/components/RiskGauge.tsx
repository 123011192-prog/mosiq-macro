import { useEffect, useState } from 'react'
import type { Light } from '../types/snapshot'
import { useReducedMotion } from '../hooks/use-reduced-motion'

/** 灯号 → 环形弧长占比：风险等级递进。 */
const GAUGE_PCT: Record<Light, number> = {
  green: 0.25,
  yellow: 0.5,
  orange: 0.75,
  red: 0.95,
  unknown: 0.08,
}
const GAUGE_WORD: Record<Light, string> = {
  green: '绿灯',
  yellow: '黄灯',
  orange: '橙灯',
  red: '红灯',
  unknown: '未知',
}

const R = 82
const C = 2 * Math.PI * R

/** 全局灯号圆环仪表盘：SVG 圆环 + 中心灯号大字 + 日期小字。
 * 加载时弧线从 0 扫到目标值（约 1s 缓出）；reduced-motion 直接呈现终态。 */
export default function RiskGauge({ light, date }: { light: Light; date?: string }) {
  const reduced = useReducedMotion()
  const target = GAUGE_PCT[light]
  const [pct, setPct] = useState(() => (reduced ? target : 0))

  useEffect(() => {
    if (reduced) {
      setPct(target)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1000)
      setPct(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, reduced])

  return (
    <div
      className={`gauge gauge-${light}`}
      role="img"
      aria-label={`全局灯号：${GAUGE_WORD[light]}`}
    >
      <svg className="gauge-svg" viewBox="0 0 200 200" aria-hidden="true">
        <circle className="gauge-track" cx="100" cy="100" r={R} />
        <circle
          className={`gauge-arc arc-${light}`}
          cx="100"
          cy="100"
          r={R}
          strokeDasharray={`${(pct * C).toFixed(2)} ${C.toFixed(2)}`}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div className="gauge-center">
        <span className={`gauge-word lv-${light}`}>{GAUGE_WORD[light]}</span>
        <span className="gauge-date mono">截至 {date || '—'}</span>
      </div>
    </div>
  )
}
