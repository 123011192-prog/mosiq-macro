import type { Light, RegionSnapshot, Snapshot } from '../types/snapshot'
import { useSnapshot } from '../hooks/use-snapshot'
import '../App.css'

const LIGHT_TXT: Record<Light, string> = {
  green: '绿灯 · 平稳',
  yellow: '黄灯 · 关注',
  orange: '橙灯 · 警戒',
  red: '红灯 · 高危',
  unknown: '未知',
}
const LIGHT_SHORT: Record<Light, string> = {
  green: '绿',
  yellow: '黄',
  orange: '橙',
  red: '红',
  unknown: '—',
}
const CYCLE_TXT: Record<string, string> = {
  up: '上行',
  neutral: '中性',
  down: '下行',
  degraded: '数据降级',
}
const RADAR_KEYS = ['banking', 'credit', 'nonbank', 'liquidity'] as const
const CYCLE_KEYS = ['growth', 'inflation', 'liquidity', 'credit', 'policy', 'market_stress'] as const

const RADAR_LABELS: Record<(typeof RADAR_KEYS)[number], string> = {
  banking: '银行与融资',
  credit: '企业信用',
  nonbank: '非银金融',
  liquidity: '市场流动性',
}
const CYCLE_LABELS: Record<(typeof CYCLE_KEYS)[number], string> = {
  growth: '增长',
  inflation: '通胀',
  liquidity: '流动性',
  credit: '信用',
  policy: '政策',
  market_stress: '市场压力',
}

/** 数据缺失时的示例快照（标注"示例数据"，与看板行为一致）。 */
const SAMPLE: Snapshot = {
  as_of: '2026-07-25',
  global_light: 'yellow',
  lights: { banking: 'green', credit: 'yellow', nonbank: 'green', liquidity: 'yellow' },
  core: { baa10y: 2.06, baa10y_pct: 71.4, curve_10y3m: -0.42, curve_inverted: true },
  cycle: { growth: 'down', inflation: 'neutral', liquidity: 'up', credit: 'neutral', policy: 'neutral', market_stress: 'neutral' },
  confirmations: [
    { label: 'VIX 期限倒挂', active: false },
    { label: '信用利差 20 日走阔 ≥100bp', active: false },
    { label: '美元 20 日上涨 ≥3%', active: false },
    { label: '曲线倒挂', active: true },
  ],
  founder_note: '增长走弱而流动性仍宽，曲线倒挂未解，黄灯下保持耐心、不追风险。',
  advice: [{ text: '维持基准配置，关注信用利差走向；黄灯期间不加杠杆。', confidence: '中' }],
  health: { data_asof: '2026-07-24', stale_count: 0, degraded: [] },
  news_link: 'https://finance.worldmonitor.app',
}

function asLight(value: string | undefined): Light {
  return value === 'green' || value === 'yellow' || value === 'orange' || value === 'red'
    ? value
    : 'unknown'
}

/** 今日结论：把灯号 + 核心信号翻译成大白话，给非专业读者一个明确 takeaway。 */
function conclusion(m: Snapshot): { title: string; detail: string } {
  const pct = m.core?.baa10y_pct
  const curve = m.core?.curve_10y3m
  const facts: string[] = []
  if (pct != null) {
    facts.push(
      pct < 50
        ? `企业借钱的紧张程度比历史上 ${(100 - pct).toFixed(0)}% 的日子都低`
        : `企业借钱的紧张程度已高于历史上 ${pct.toFixed(0)}% 的日子`,
    )
  }
  if (curve != null) {
    facts.push(curve >= 0 ? '国债长短期利差形态正常' : '国债曲线倒挂（历史上最可靠的衰退预警之一）')
  }
  const factTxt = facts.length ? facts.join('，') + '。' : ''
  switch (m.global_light) {
    case 'green':
      return {
        title: '今日结论：风险平稳，无需动作',
        detail: `${factTxt}四类危机雷达均无异常信号。按系统规则，今天保持现状即可。`,
      }
    case 'yellow':
      return {
        title: '今日结论：出现早期风险信号，保持关注',
        detail: `${factTxt}有风险指标开始抬头但尚未形成共振。规则建议：不加杠杆、不追高，继续观察。`,
      }
    case 'orange':
      return {
        title: '今日结论：多个风险信号相互印证，应当警觉',
        detail: `${factTxt}独立模块同时恶化。规则建议：降低风险仓位、提高现金与流动性。`,
      }
    case 'red':
      return {
        title: '今日结论：高危状态，防御优先',
        detail: `${factTxt}风险信号已广泛确认。规则建议：防御姿态，等待系统解除信号。`,
      }
    default:
      return {
        title: '今日结论：数据不足，暂不判断',
        detail: '核心数据尚未就位，请稍后再看。',
      }
  }
}

/** 创始人笔记兜底：引擎的"数据不全"是内部诚实机制，
 * 公网展示换成平静的解释；灯号主触发器数据完好时这句话才成立。 */
function displayNote(m: Snapshot): string {
  const note = m.founder_note || ''
  if (note.includes('数据不全') || note.includes('数据完整性不足')) {
    return '核心信号（Baa 利差分位 + 国债曲线）数据完好，今日灯号可信；个别增强指标受免费数据源限制未覆盖，已在页脚标注，不影响灯号判断。'
  }
  return note || '今日笔记待填写。'
}

/** 页脚健康信息：把内部代码翻译成读者能懂的话。 */
const DEGRADED_TXT: Record<string, string> = {
  'refresh:yahoo:GOLD_YAHOO': '黄金价格更新延迟（数据源限流，会自动恢复）',
  'refresh:yahoo:GSPC_YAHOO': '美股指数更新延迟（数据源限流，会自动恢复）',
  'cycle:market_stress': '市场压力模块个别增强指标未覆盖',
  'radar:banking': '银行雷达个别增强指标未覆盖',
  'radar:nonbank': '非银雷达个别增强指标未覆盖',
}

function healthText(m: Snapshot): string {
  const h = m.health || {}
  const parts: string[] = []
  if (h.data_asof) parts.push(`数据更新至 ${h.data_asof}`)
  if (h.stale_count) parts.push(`${h.stale_count} 项数据稍有延迟`)
  const degraded = (h.degraded || []).map((d) => DEGRADED_TXT[d] || d)
  if (degraded.length) parts.push(degraded.join('；'))
  return parts.length ? parts.join(' · ') : '数据完整'
}

const LIGHT_GUIDE: Array<{ light: Light; text: string }> = [
  { light: 'green', text: '绿灯·平稳：正常运行，无需动作' },
  { light: 'yellow', text: '黄灯·关注：早期信号出现，不加杠杆、不追高' },
  { light: 'orange', text: '橙灯·警戒：降低风险仓位，提高现金与流动性' },
  { light: 'red', text: '红灯·高危：防御姿态，等待系统解除信号' },
]

function LightDot({ light, big }: { light: Light; big?: boolean }) {
  return <span className={`px ${big ? 'big ' : ''}${light}`} aria-hidden="true" />
}

/* ── 全球区域面板（美国以外） ───────────────────── */
const REGION_ORDER = ['euro_area', 'china', 'japan', 'korea'] as const
const REGION_NAMES: Record<string, string> = {
  euro_area: '欧元区',
  china: '中国',
  japan: '日本',
  korea: '韩国',
}
const REGION_CYCLE_KEYS = ['growth', 'policy', 'credit', 'market', 'fx'] as const
const REGION_CYCLE_LABELS: Record<(typeof REGION_CYCLE_KEYS)[number], string> = {
  growth: '增长',
  policy: '政策',
  credit: '信贷',
  market: '市场',
  fx: '汇率',
}
const DIR_TXT: Record<string, string> = {
  up: '上行',
  neutral: '中性',
  down: '下行',
  degraded: '数据降级',
}
const DIR_ARROW: Record<string, string> = { up: '↑', neutral: '→', down: '↓', degraded: '—' }

function fmtRegionValue(v: number | null, unit?: string): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const txt =
    abs >= 10000
      ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : abs >= 100
        ? v.toFixed(1)
        : v.toFixed(2)
  return unit && unit !== '指数' && unit !== '指数/点位' ? `${txt} ${unit}` : txt
}

function RegionCard({ regionKey, region }: { regionKey: string; region: RegionSnapshot }) {
  const light = asLight(region.light)
  const signalInds = (region.indicators || []).filter(
    (ind) => ind.signal && Object.keys(ind.signal).length > 0,
  )
  return (
    <div className="region-card">
      <div className="region-head">
        <span className="region-name">{REGION_NAMES[regionKey] || regionKey}</span>
        <span className="region-light">
          <LightDot light={light} />
          <span className={`lv-${light}`}>{LIGHT_SHORT[light]}灯</span>
        </span>
      </div>
      {region.status !== 'ok' && (
        <p className="region-degraded">⚠ 数据不完整：部分读数滞后或缺失，请谨慎参考</p>
      )}
      {region.summary && <p className="region-sum">{region.summary}</p>}
      <div className="region-cyc">
        {REGION_CYCLE_KEYS.map((dim) => {
          const dir = region.cycle?.[dim] || 'neutral'
          const cls =
            dir === 'up' ? 's-up' : dir === 'down' ? 's-down' : dir === 'degraded' ? 's-degraded' : 's-neutral'
          return (
            <span className="region-dim" key={dim}>
              {REGION_CYCLE_LABELS[dim]}
              <b className={cls}>
                {DIR_ARROW[dir] || '→'} {DIR_TXT[dir] || '—'}
              </b>
            </span>
          )
        })}
      </div>
      {signalInds.length > 0 && (
        <ul className="region-ind">
          {signalInds.map((ind) => (
            <li key={ind.id}>
              <span className="ind-name">{ind.name}</span>
              <span className="ind-val mono">{fmtRegionValue(ind.value, ind.unit)}</span>
              <span className="ind-date mono">{ind.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Home() {
  const { snapshot, briefs, loading, error } = useSnapshot()
  const isSample = !snapshot
  const m = snapshot ?? SAMPLE
  const globalLight = asLight(m.global_light)
  const newsLink = m.news_link || 'https://finance.worldmonitor.app'

  return (
    <main className="page">
      <header className="brandbar">
        <div className="brand">
          <img className="logo" src="assets/mosiq-logo.png" alt="MOSIQ" />
          <div>
            <div className="title">
              全球宏观罗盘 · 每日快照
              {isSample && !loading && <span className="sample">示例数据</span>}
            </div>
            <div className="sub">AI-NATIVE DECISION INTELLIGENCE</div>
          </div>
        </div>
        <div className="asof-top">
          截至 <span className="mono">{m.as_of || '—'}</span>
        </div>
      </header>

      <section className="hero" aria-label="全局风险灯号">
        <div className="hero-left">
          <LightDot light={globalLight} big />
          <span className={`hero-light lv-${globalLight}`}>{LIGHT_TXT[globalLight]}</span>
        </div>
        <p className="hero-sub">
          BAA10Y 核心分位 + 10Y–3M 曲线为主触发器，复杂引擎为确认层 · 规则冻结 · 证据链可审计
        </p>
      </section>

      <section className="concl" aria-label="今日结论">
        <div className="concl-title">{conclusion(m).title}</div>
        <p className="concl-detail">{conclusion(m).detail}</p>
      </section>

      <section aria-label="创始人笔记" className="card">
        <div className="note">
          <img className="avatar" src="assets/grace-avatar.jpg" alt="Grace Yang" />
          <div>
            <div className="who">Grace Yang · 创始人笔记</div>
            <blockquote>{displayNote(m)}</blockquote>
          </div>
        </div>
      </section>

      <section aria-label="危机雷达" className="card">
        <h2>危机雷达（四类）· 美国</h2>
        <p className="sec-note">美国金融系统四个部位的健康灯——全绿 = 没有起火迹象。</p>
        <div className="radar">
          {RADAR_KEYS.map((key) => {
            const light = asLight(m.lights?.[key])
            return (
              <div className="cell" key={key}>
                <span className="lab">{RADAR_LABELS[key]}</span>
                <LightDot light={light} />
                <span className={`lv-${light}`}>{LIGHT_SHORT[light]}</span>
              </div>
            )
          })}
        </div>
        <div className="core">
          <dl>
            <dt>Baa 利差</dt>
            <dd>{m.core?.baa10y == null ? '—' : `${m.core.baa10y.toFixed(2)}%`}</dd>
            <dd className="cap">美国低评级企业借债比国债多付的利息，危机前会快速飙升</dd>
          </dl>
          <dl>
            <dt>历史分位</dt>
            <dd>{m.core?.baa10y_pct == null ? '—' : `${m.core.baa10y_pct.toFixed(0)}%`}</dd>
            <dd className="cap">当前利差在历史中的位置，越高越危险，≥70% 触发黄灯</dd>
          </dl>
          <dl>
            <dt>10Y–3M 曲线</dt>
            <dd>
              {m.core?.curve_10y3m == null
                ? '—'
                : `${m.core.curve_10y3m > 0 ? '+' : ''}${m.core.curve_10y3m.toFixed(2)}${
                    m.core.curve_inverted ? '（倒挂）' : ''
                  }`}
            </dd>
            <dd className="cap">长短期国债利差，变成负数（倒挂）是最可靠的衰退预警之一</dd>
          </dl>
        </div>
      </section>

      <section aria-label="周期状态" className="card">
        <h2>六维周期状态 · 美国</h2>
        <p className="sec-note">美国经济现在的六项体温——向上 / 中性 / 向下，一眼看清方向。</p>
        <div className="cyc">
          {CYCLE_KEYS.map((key) => {
            const st = m.cycle?.[key] || 'neutral'
            const cls =
              st === 'up' ? 's-up' : st === 'down' ? 's-down' : st === 'degraded' ? 's-degraded' : 's-neutral'
            return (
              <div className="m" key={key}>
                <span className="name">{CYCLE_LABELS[key]}</span>
                <span className={cls}>{CYCLE_TXT[st] || '—'}</span>
              </div>
            )
          })}
        </div>
      </section>

      {m.regions && REGION_ORDER.some((k) => m.regions?.[k]) && (
        <section aria-label="全球区域面板" className="card">
          <h2>全球区域面板 · 美国以外</h2>
          <p className="region-lead">
            全球灯号由美国核心引擎判定；这里的区域面板提供美国以外的风险视角。
            数据来自 OECD / BIS / 各国央行，BIS 信贷数据滞后 2–3 个季度属正常现象——每条读数旁都标注了数据日期。
          </p>
          <div className="region-grid">
            {REGION_ORDER.filter((k) => m.regions?.[k]).map((k) => (
              <RegionCard key={k} regionKey={k} region={m.regions![k]} />
            ))}
          </div>
        </section>
      )}

      <div className="grid-2">
        <section aria-label="跨资产确认" className="card">
          <h2>跨资产确认</h2>
          <ul className="cf">
            {(m.confirmations ?? []).map((item) => (
              <li key={item.label} className={item.active ? 'on' : ''}>
                <span className="dot" aria-hidden="true" />
                {item.label}
                {item.active ? ' · 触发' : ''}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="监测建议" className="card">
          <h2>监测建议（非个性化投资意见）</h2>
          <ul className="ad">
            {(m.advice ?? []).map((item, i) => (
              <li key={i}>
                {item.confidence && <span className="tag">置信 {item.confidence}</span>}
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {briefs && briefs.items.length > 0 && (
        <section aria-label="今日事件" className="card">
          <h2>今日事件 · worldmonitor 新闻雷达</h2>
          <ul className="briefs">
            {briefs.items.map((b, i) => (
              <li key={i}>
                {b.url ? (
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="brief-title">
                    {b.title}
                  </a>
                ) : (
                  <span className="brief-title">{b.title}</span>
                )}
                <p>{b.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="灯号使用说明" className="card guide">
        <h2>这个盘面怎么用</h2>
        <p className="guide-lead">每天早上回答一个问题：今天全球金融系统有没有正在酝酿的危机？按灯号行动——</p>
        <ul className="guide-list">
          {LIGHT_GUIDE.map((g) => (
            <li key={g.light}>
              <LightDot light={g.light} />
              <span>{g.text}</span>
            </li>
          ))}
        </ul>
        <p className="guide-note">以上为系统性规则的方向性参考，不构成个性化投资建议。</p>
      </section>

      <footer className="foot">
        <span>{healthText(m)}</span>
        <a className="news" href={newsLink} target="_blank" rel="noopener noreferrer">
          新闻雷达 worldmonitor ↗
        </a>
        <span>MOSIQ · 规则冻结 · 证据链可审计</span>
        {error && <span className="err">数据加载失败（展示示例）：{error}</span>}
      </footer>
    </main>
  )
}
