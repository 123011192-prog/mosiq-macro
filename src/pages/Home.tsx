import type { Light, Snapshot } from '../types/snapshot'
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

function LightDot({ light, big }: { light: Light; big?: boolean }) {
  return <span className={`px ${big ? 'big ' : ''}${light}`} aria-hidden="true" />
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

      <section aria-label="创始人笔记" className="card">
        <div className="note">
          <img className="avatar" src="assets/grace-avatar.jpg" alt="Grace Yang" />
          <div>
            <div className="who">Grace Yang · 创始人笔记</div>
            <blockquote>{m.founder_note || '今日笔记待填写。'}</blockquote>
          </div>
        </div>
      </section>

      <section aria-label="危机雷达" className="card">
        <h2>危机雷达（四类）</h2>
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
          </dl>
          <dl>
            <dt>历史分位</dt>
            <dd>{m.core?.baa10y_pct == null ? '—' : `${m.core.baa10y_pct.toFixed(0)}%`}</dd>
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
          </dl>
        </div>
      </section>

      <section aria-label="周期状态" className="card">
        <h2>六维周期状态</h2>
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

      <footer className="foot">
        <span>
          数据健康：断更 {m.health?.stale_count ?? '—'} 项（数据至 {m.health?.data_asof || '—'}）
          {m.health?.degraded?.length ? `，降级模块：${m.health.degraded.join('、')}` : ''}
        </span>
        <a className="news" href={newsLink} target="_blank" rel="noopener noreferrer">
          新闻雷达 worldmonitor ↗
        </a>
        <span>MOSIQ · 规则冻结 · 证据链见验收报告</span>
        {error && <span className="err">数据加载失败（展示示例）：{error}</span>}
      </footer>
    </main>
  )
}
