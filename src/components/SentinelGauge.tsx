/** 哨兵迷你量规（变灯距离卡内 · 油价/美债/黄金三条共用）。
 * 复用 BAA10Y 变灯距离量规的视觉语言：渐变填充 + 阈值虚线刻度。
 * 当前值按 0 ~ max 比例填充，语义色 = 风险方向：
 * ≥ 触发阈值红、>0 橙、≤0 绿/灰；阈值处画虚线刻度并标注阈值文字。
 * 纯展示组件，不引入任何动画，天然遵守 prefers-reduced-motion。 */
interface SentinelGaugeProps {
  /** 当前读数（20 日涨幅 % 或 20 日 bp 变动）；null 时仅画空轨与阈值刻度。 */
  value: number | null
  /** 量规条范围终点（超出打满）。 */
  max: number
  /** 触发阈值（虚线刻度位置）。 */
  threshold: number
  /** 阈值刻度旁的文字（如 +10% / +30bp / +8%）。 */
  thresholdLabel: string
  ariaLabel: string
}

export default function SentinelGauge({
  value,
  max,
  threshold,
  thresholdLabel,
  ariaLabel,
}: SentinelGaugeProps) {
  const tickPct = Math.max(0, Math.min(100, (threshold / max) * 100))
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  const lvl =
    value == null ? 'sg-calm' : value >= threshold ? 'sg-red' : value > 0 ? 'sg-orange' : 'sg-calm'
  const hit = value != null && value >= threshold
  return (
    <div className="sg" role="img" aria-label={ariaLabel}>
      <div className="sg-track">
        <div className={`sg-fill ${lvl}`} style={{ width: `${pct}%` }} />
        {value != null && value > 0 && (
          <span className="sg-now" style={{ left: `${pct}%` }} />
        )}
        <span className="sg-tick" style={{ left: `${tickPct}%` }} />
      </div>
      <div className="sg-scale">
        <span
          className={`${tickPct > 75 ? 'at-end' : ''}${hit ? ' hit' : ''}`}
          style={{ left: `${tickPct}%` }}
        >
          阈值 {thresholdLabel}
        </span>
      </div>
    </div>
  )
}
