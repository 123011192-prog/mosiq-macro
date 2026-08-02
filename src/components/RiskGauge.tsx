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

/* ── 罗盘刻度几何 ──
 * 分位 0–100% 映射为 240° 表盘：0% 在左下（-120°），100% 在右下（+120°），
 * 顶部 12 点方向为 50%（罗盘"正北"= 历史中位）。 */
const SWEEP = 240
const START = -120
const angleOf = (p: number) => START + (Math.max(0, Math.min(100, p)) / 100) * SWEEP

/** 极坐标（度，0 = 12 点方向，顺时针）→ SVG 坐标。 */
function polar(deg: number, r: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)]
}

/** 外圈刻度：每 5% 一格小刻度，每 25% 一格大刻度并标注分位数。 */
const TICKS: Array<{ deg: number; major: boolean; label?: string }> = []
for (let p = 0; p <= 100; p += 5) {
  const major = p % 25 === 0
  TICKS.push({ deg: angleOf(p), major, label: major ? String(p) : undefined })
}

/** 变灯阈值在罗盘上的位置标记（与规则透明化一致）。 */
const THRESH = [
  { p: 70, cls: 'ct-yellow' },
  { p: 75, cls: 'ct-orange' },
  { p: 92, cls: 'ct-red' },
]

/** 回摆缓动：轻微过冲后定格（约 1s），模拟罗盘指针归位。 */
function easeOutBack(t: number): number {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** 全局灯号罗盘仪表盘：SVG 圆环 + 外圈 0–100 分位刻度 + 指针指向当前
 * BAA10Y 核心分位；加载时指针从 0 位摆动后定格（约 1s 回摆缓动），
 * 指针呼吸光晕、刻度环缓慢流光（沿用 --glow-rgb 体系）。
 * reduced-motion 直接呈现终态。 */
export default function RiskGauge({
  light,
  date,
  pct,
}: {
  light: Light
  date?: string
  /** BAA10Y 核心分位（0–100），决定指针角度；缺省时指向灯号档位中值。 */
  pct?: number | null
}) {
  const reduced = useReducedMotion()
  const target = GAUGE_PCT[light]
  const targetPct = pct != null ? Math.max(0, Math.min(100, pct)) : target * 100
  const [arc, setArc] = useState(() => (reduced ? target : 0))
  const [needle, setNeedle] = useState(() => (reduced ? targetPct : 0))

  useEffect(() => {
    if (reduced) {
      setArc(target)
      setNeedle(targetPct)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1000)
      setArc(target * (1 - Math.pow(1 - p, 3)))
      setNeedle(targetPct * easeOutBack(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, targetPct, reduced])

  const needleDeg = angleOf(needle)
  const [tipX, tipY] = polar(needleDeg, 66)
  const [tailX, tailY] = polar(needleDeg + 180, 14)
  const [blX, blY] = polar(needleDeg - 90, 5)
  const [brX, brY] = polar(needleDeg + 90, 5)

  return (
    <div
      className={`gauge gauge-${light}`}
      role="img"
      aria-label={`全局风险罗盘：${GAUGE_WORD[light]}，核心分位 ${targetPct.toFixed(0)}%`}
    >
      <svg className="gauge-svg" viewBox="-12 -12 224 224" aria-hidden="true">
        {/* 外圈刻度环：0–100 分位 */}
        <g className="gauge-ticks">
          {TICKS.map((tk) => {
            const [x1, y1] = polar(tk.deg, tk.major ? 90 : 92)
            const [x2, y2] = polar(tk.deg, 97)
            return (
              <line
                key={tk.deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={tk.major ? 'tick tick-major' : 'tick'}
              />
            )
          })}
          {TICKS.filter((tk) => tk.label != null).map((tk) => {
            const [x, y] = polar(tk.deg, 107)
            return (
              <text key={`l${tk.deg}`} x={x} y={y} className="tick-label">
                {tk.label}
              </text>
            )
          })}
          {/* 变灯阈值小棱标 */}
          {THRESH.map((th) => {
            const [x, y] = polar(angleOf(th.p), 97)
            return <circle key={th.p} cx={x} cy={y} r={2.2} className={`compass-thresh ${th.cls}`} />
          })}
        </g>

        {/* 主圆环：轨道 + 灯号弧 */}
        <circle className="gauge-track" cx="100" cy="100" r={R} />
        <circle
          className={`gauge-arc arc-${light}`}
          cx="100"
          cy="100"
          r={R}
          strokeDasharray={`${(arc * C).toFixed(2)} ${C.toFixed(2)}`}
          transform="rotate(-90 100 100)"
        />
        {/* 刻度环缓慢流光：一段低透明亮弧绕环旋转（reduced-motion 下静止） */}
        <circle
          className={`gauge-comet arc-${light}`}
          cx="100"
          cy="100"
          r={R}
          strokeDasharray={`${(C * 0.12).toFixed(2)} ${C.toFixed(2)}`}
          transform="rotate(-90 100 100)"
        >
          {!reduced && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="5.5s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* 罗盘指针：指向当前核心分位 */}
        <g className="gauge-needle">
          <polygon
            points={`${tipX.toFixed(2)},${tipY.toFixed(2)} ${blX.toFixed(2)},${blY.toFixed(2)} ${tailX.toFixed(2)},${tailY.toFixed(2)} ${brX.toFixed(2)},${brY.toFixed(2)}`}
            className="needle-body"
          />
          <circle cx="100" cy="100" r="4.5" className="needle-hub" />
        </g>
      </svg>
      <div className="gauge-center">
        <span className={`gauge-word lv-${light}`}>{GAUGE_WORD[light]}</span>
        <span className="gauge-pct mono">{targetPct.toFixed(0)}分位</span>
        <span className="gauge-date mono">截至 {date || '—'}</span>
      </div>
    </div>
  )
}
