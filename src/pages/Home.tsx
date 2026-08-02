import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Light, RegionSnapshot, Snapshot } from '../types/snapshot'
import { useSnapshot } from '../hooks/use-snapshot'
import { useReducedMotion } from '../hooks/use-reduced-motion'
import RiskGauge from '../components/RiskGauge'
import SentinelGauge from '../components/SentinelGauge'
import {
  asLight,
  LIGHT_SHORT,
  REGION_CYCLE_KEYS,
  REGION_CYCLE_LABELS,
  REGION_FLAGS,
  REGION_NAMES,
  REGION_ORDER,
} from '../components/region-shared'
import '../App.css'

const LIGHT_TXT: Record<Light, string> = {
  green: '绿灯 · 平稳',
  yellow: '黄灯 · 关注',
  orange: '橙灯 · 警戒',
  red: '红灯 · 高危',
  unknown: '未知',
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

/** 灯带排序权重：红 > 橙 > 黄 > 绿，同级保持原顺序（稳定排序）。 */
const LIGHT_SEV: Record<Light, number> = { red: 0, orange: 1, yellow: 2, green: 3, unknown: 4 }

/** 数据加载失败时的示例快照（显著标注"示例数据"，仅作兜底展示）。 */
const SAMPLE_REGION: Record<string, RegionSnapshot> = {
  euro_area: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'neutral', credit: 'neutral', market: 'neutral', fx: 'neutral' },
    indicators: [
      { id: 'oecd_cli_eu', name: 'OECD 欧元区综合领先指标 CLI', value: 99.8, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.1 } },
    ],
    light: 'green',
    summary: '欧元区：增长平稳、信贷平稳、市场平稳，区域绿灯',
  },
  china: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'up', credit: 'neutral', market: 'neutral', fx: 'neutral' },
    indicators: [
      { id: 'oecd_cli_cn', name: 'OECD 中国综合领先指标 CLI', value: 100.4, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.3 } },
    ],
    light: 'green',
    summary: '中国：增长平稳、信贷平稳、市场平稳，区域绿灯',
  },
  japan: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'up', credit: 'neutral', market: 'neutral', fx: 'down' },
    indicators: [
      { id: 'oecd_cli_jp', name: 'OECD 日本综合领先指标 CLI', value: 100.1, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.2 } },
    ],
    light: 'yellow',
    summary: '日本：增长平稳、信贷平稳、汇率走弱，区域黄灯',
  },
  korea: {
    status: 'ok',
    cycle: { growth: 'down', policy: 'neutral', credit: 'down', market: 'down', fx: 'down' },
    indicators: [
      { id: 'oecd_cli_kr', name: 'OECD 韩国综合领先指标 CLI', value: 99.2, date: '2026-06-01', unit: '指数', signal: { '3m_change': -0.6 } },
    ],
    light: 'orange',
    summary: '韩国：增长走弱、信贷走弱、市场走弱，区域橙灯',
  },
  uk: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'neutral', credit: 'neutral', market: 'up', fx: 'neutral' },
    indicators: [
      { id: 'oecd_cli_gb', name: 'OECD 英国综合领先指标 CLI', value: 100.2, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.2 } },
    ],
    light: 'green',
    summary: '英国：增长平稳、信贷平稳、市场走强，区域绿灯',
  },
  canada: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'neutral', credit: 'neutral', market: 'neutral', fx: 'neutral' },
    indicators: [
      { id: 'oecd_cli_ca', name: 'OECD 加拿大综合领先指标 CLI', value: 99.9, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.0 } },
    ],
    light: 'green',
    summary: '加拿大：增长平稳、信贷平稳、市场平稳，区域绿灯',
  },
  australia: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'neutral', credit: 'neutral', market: 'up', fx: 'neutral' },
    indicators: [
      { id: 'oecd_cli_au', name: 'OECD 澳大利亚综合领先指标 CLI', value: 100.0, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.1 } },
    ],
    light: 'green',
    summary: '澳大利亚：增长平稳、信贷平稳、市场走强，区域绿灯',
  },
  india: {
    status: 'ok',
    cycle: { growth: 'up', policy: 'neutral', credit: 'up', market: 'up', fx: 'neutral' },
    indicators: [
      { id: 'oecd_cli_in', name: 'OECD 印度综合领先指标 CLI', value: 101.1, date: '2026-06-01', unit: '指数', signal: { '3m_change': 0.5 } },
    ],
    light: 'green',
    summary: '印度：增长走强、信贷走强、市场走强，区域绿灯',
  },
  brazil: {
    status: 'ok',
    cycle: { growth: 'neutral', policy: 'up', credit: 'neutral', market: 'neutral', fx: 'down' },
    indicators: [
      { id: 'oecd_cli_br', name: 'OECD 巴西综合领先指标 CLI', value: 99.7, date: '2026-06-01', unit: '指数', signal: { '3m_change': -0.2 } },
    ],
    light: 'yellow',
    summary: '巴西：增长平稳、信贷平稳、汇率走弱，区域黄灯',
  },
}

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
  regions: SAMPLE_REGION,
  rates_watch: {
    us10y: { value: 4.68, date: '2026-07-24', change_20d_bp: 19.0, source: 'fred' },
    us30y: { value: 5.21, date: '2026-07-24', change_20d_bp: 23.0, source: 'fred' },
    us02y: { value: 4.23, date: '2026-07-24', change_20d_bp: 9.0, source: 'fred' },
    spread_2s10s: { value_bp: 45.0, date: '2026-07-24' },
    long_end_selloff: {
      rule: '10Y或30Y收益率20个交易日上行≥30bp记为长端抛售压力',
      active: false,
      us10y_change_20d_bp: 19.0,
      us30y_change_20d_bp: 23.0,
      note: '仅作证据记录，不参与灯号判定',
    },
    geopolitical_note: '避险买债压收益率、财政担忧抛长端抬收益率——同样的大幅波动方向很重要',
    latest_quotes: { us10y: null, us30y: null },
  },
  gold_watch: {
    spot: { value: 4074.1, date: '2026-07-21', change_20d_pct: 1.5, change_3m_pct: -10.7, source: 'local_cache' },
    risk_off_signal: {
      rule: '金价20日上涨≥8%记为避险升温信号',
      active: false,
      change_20d_pct: 1.5,
      note: '仅作证据记录：不参与灯号判定，也不计入确认项计数',
    },
    note: '黄金是避险与去美元化的双重温度计——与实际利率和地缘局势联动解读',
  },
  world_brief: null,
  news_link: 'https://finance.worldmonitor.app',
}

/** 创始人笔记区的辅助小字：把核心信号翻译成一句大白话背景，
 * 次要呈现，不抢创始人一句话的主视觉。 */
function conclSupport(m: Snapshot): string {
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
  const radarAllGreen = (['banking', 'credit', 'nonbank', 'liquidity'] as const).every(
    (k) => asLight(m.lights?.[k]) === 'green',
  )
  if (radarAllGreen) facts.push('四类危机雷达均无异常信号')
  return facts.length ? `背景速读：${facts.join('，')}。` : ''
}

/** 创始人笔记：引擎已输出纯市场口吻，兜底只保留"待填写"。 */
function displayNote(m: Snapshot): string {
  return m.founder_note || '今日笔记待填写。'
}

/** 页脚健康信息：把内部代码翻译成读者能懂的话。 */
/** 内部降级代码 → 读者能懂的话。按命名空间解析映射，
 * 任何未识别的代码都归入通用文案，绝不把原始代码串显示在页面上。 */
const YAHOO_TXT: Record<string, string> = {
  GOLD_YAHOO: '黄金价格更新延迟（数据源限流，会自动恢复）',
  GSPC_YAHOO: '美股指数更新延迟（数据源限流，会自动恢复）',
}
const REFRESH_TXT: Record<string, string> = {
  fred_api_key_missing: 'FRED 密钥未生效，使用缓存数据',
}
const REGION_DEGRADED_TXT: Record<string, string> = {
  euro_area: '欧元区面板本次更新不完整',
  china: '中国面板本次更新不完整',
  japan: '日本面板本次更新不完整',
  korea: '韩国面板本次更新不完整',
  uk: '英国面板本次更新不完整',
  canada: '加拿大面板本次更新不完整',
  australia: '澳大利亚面板本次更新不完整',
  india: '印度面板本次更新不完整',
  brazil: '巴西面板本次更新不完整',
}
const RADAR_DEGRADED_TXT: Record<string, string> = {
  banking: '银行雷达个别增强指标未覆盖',
  credit: '企业信用雷达个别增强指标未覆盖',
  nonbank: '非银雷达个别增强指标未覆盖',
  liquidity: '流动性雷达个别增强指标未覆盖',
}
const CYCLE_DEGRADED_TXT: Record<string, string> = {
  market_stress: '市场压力模块个别增强指标未覆盖',
}

function degradedText(code: string): string {
  const [ns, a, b] = code.split(':')
  switch (ns) {
    case 'refresh':
      if (a === 'yahoo') return YAHOO_TXT[b] || '个别市场行情更新延迟（数据源限流，会自动恢复）'
      return REFRESH_TXT[a] || '个别数据源本次未刷新，沿用最近缓存数据'
    case 'regions':
      return REGION_DEGRADED_TXT[a] || '个别区域面板本次更新不完整'
    case 'radar':
      return RADAR_DEGRADED_TXT[a] || '个别雷达模块的增强指标未覆盖'
    case 'cycle':
      return CYCLE_DEGRADED_TXT[a] || '个别周期模块的增强指标未覆盖'
    default:
      return '部分增强指标未更新'
  }
}

function healthText(m: Snapshot): string {
  const h = m.health || {}
  const parts: string[] = []
  if (h.data_asof) parts.push(`数据更新至 ${h.data_asof}`)
  if (h.stale_count) parts.push(`${h.stale_count} 项数据稍有延迟`)
  const degraded = [...new Set((h.degraded || []).map(degradedText))]
  if (degraded.length) parts.push(degraded.join('；'))
  return parts.length ? parts.join(' · ') : '数据完整'
}

const LIGHT_GUIDE: Array<{ light: Light; text: string }> = [
  { light: 'green', text: '绿灯·平稳：正常运行，无需动作' },
  { light: 'yellow', text: '黄灯·关注：早期信号出现，不加杠杆、不追高' },
  { light: 'orange', text: '橙灯·警戒：降低风险仓位，提高现金与流动性' },
  { light: 'red', text: '红灯·高危：防御姿态，等待系统解除信号' },
]

function LightDot({ light }: { light: Light }) {
  return <span className={`px ${light}`} aria-hidden="true" />
}

/* ── 行情来源标签与今日世界简报辅助 ─────────────── */

/** 行情来源 → 读者能懂的浅灰小字。 */
function srcLabel(source?: string): string {
  switch (source) {
    case 'yahoo_gw':
      return 'Yahoo网关'
    case 'yahoo_direct':
      return 'Yahoo直连'
    case 'local_cache':
      return '本地缓存'
    case 'fred':
      return 'FRED'
    case 'tushare':
      return '美债官方曲线'
    default:
      return ''
  }
}

/** ISO 日期 → MM-DD（紧凑展示）。 */
function mmdd(date?: string | null): string {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(date || '')
  return m ? `${m[1]}-${m[2]}` : ''
}

/** 发布时间 → 中文相对时间。 */
function relTime(published: string): string {
  const t = Date.parse(published)
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return days <= 1 ? '昨天' : `${days}天前`
}

/** 简报分类 → chip 颜色类名（蓝=货币政策、红=地缘冲突、橙=能源、紫=科技产业链）。 */
function wbCatClass(category: string): string {
  if (category.includes('货币')) return 'wb-blue'
  if (category.includes('地缘')) return 'wb-red'
  if (category.includes('能源')) return 'wb-orange'
  if (category.includes('科技')) return 'wb-purple'
  return 'wb-blue'
}

/* ── 动效辅助 ───────────────────────── */

/** 数字滚动：数据加载完成后从 0 缓动滚动到目标值；reduced-motion 下直接呈现终值。 */
function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(() => (reduced ? value : 0))
  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const duration = 850
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setDisplay(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])
  return <>{format(display)}</>
}

/** 入场 stagger 序号 → CSS 变量。 */
function reveal(i: number): CSSProperties {
  return { '--i': i } as CSSProperties
}

/** 数据加载中的品牌骨架屏：不渲染任何灯号或数据。 */
function LoadingScreen() {
  return (
    <main className="page" aria-busy="true" aria-label="数据加载中">
      <header className="brandbar">
        <div className="brand">
          <img className="logo" src="assets/mosiq-mark.png" alt="MOSIQ" />
          <div>
            <div className="title">全球宏观罗盘 · 每日快照</div>
            <div className="sub">AI-NATIVE DECISION INTELLIGENCE</div>
          </div>
        </div>
      </header>
      <section className="hero hero-loading">
        <span className="loading-spinner" aria-hidden="true" />
        <p className="loading-text">正在加载今日快照…</p>
      </section>
      <div className="skel skel-lg" aria-hidden="true" />
      <div className="skel" aria-hidden="true" />
      <div className="skel" aria-hidden="true" />
    </main>
  )
}

/** 变灯距离 · 规则透明化：把黄 / 橙 / 红灯阈值画在一条 0–100% 分位轴上，
 * 让读者一眼看到"现在离变灯还有多远"。只读 core 数据，不改任何判定逻辑。 */
const THRESH_TICKS = [
  { v: 70, name: '黄灯', cls: 'k-yellow' },
  { v: 75, name: '橙灯', cls: 'k-orange' },
  { v: 92, name: '红灯', cls: 'k-red' },
]

function moodOf(gap: number): { text: string; cls: string } {
  if (gap <= 0) return { text: '已越过黄灯阈值', cls: 'lv-yellow' }
  if (gap > 40) return { text: '离变黄灯还很远', cls: 'lv-green' }
  if (gap > 20) return { text: '进入观察区', cls: 'lv-yellow' }
  return { text: '接近变灯', cls: 'lv-orange' }
}

/** 三条哨兵（油/债/金）共用的 20 日变化量着色：≥触发阈值红、>0 橙、≤0 绿。 */
function chgClsOf(v: number, threshold: number): string {
  return v >= threshold ? 'surge' : v > 0 ? 'up' : 'down'
}

/** 哨兵状态箭头：涨 ▲ / 跌 ▼。 */
function chgArrow(v: number): string {
  return v > 0 ? '▲' : v < 0 ? '▼' : ''
}

/* ── 哨兵三条（一行一条极简 + 历史危机剧本标签） ── */

/** 油价观察 · 第一条哨兵：WTI 读数（布伦特兜底）+ 20 日涨幅迷你量规
 * （范围 0~15%，阈值 +10% 通胀压力证据；超出打满）。
 * 剧本标签：石油冲击 1973·1979·1990。触发确认时数值红色强调、状态点呼吸。 */
function OilStrip({ m }: { m: Snapshot }) {
  const oil = m.oil_watch
  const primary = oil?.wti?.value != null ? oil.wti : oil?.brent?.value != null ? oil.brent : null
  if (!oil || !primary || primary.value == null) return null
  const qName = oil.wti?.value != null ? 'WTI' : '布伦特'
  const surge = (m.confirmations ?? []).some((c) => c.label.includes('油价') && c.active)
  const active = surge || !!oil.inflation_evidence?.active
  const chg = primary.change_20d_pct ?? null
  const src = [srcLabel(primary.source), mmdd(primary.date)].filter(Boolean).join('·')
  return (
    <div className={`sent${active ? ' sent-on' : ''}`} aria-label="油价观察">
      <div className="sent-row">
        <span className={`oil-dot${active ? ' on' : ''}`} aria-hidden="true" />
        <span className="sent-name">油价</span>
        <span className="sent-q">
          <span className="sent-q-name">{qName}</span>
          <b className="sent-val mono">{primary.value.toFixed(2)}</b>
        </span>
        {chg != null && (
          <b className={`sent-chg mono ${chgClsOf(chg, 10)}`}>
            {chgArrow(chg)}
            {Math.abs(chg).toFixed(1)}%
          </b>
        )}
        <SentinelGauge
          value={chg}
          max={15}
          threshold={10}
          thresholdLabel="+10%"
          ariaLabel={`${qName} 20日涨幅 ${chg != null ? `${chg.toFixed(1)}%` : '—'}，通胀压力触发阈值 +10%`}
        />
        <span className="sent-script">石油冲击 1973·1979·1990</span>
        {src && <span className="sent-src mono">{src}</span>}
      </div>
    </div>
  )
}

/** 美债收益率观察 · 第二条哨兵：10Y 主读数（Tushare 美债官方曲线 /
 * Yahoo 网关收盘在场时主显，否则 FRED）+ 20 日 bp 变动迷你量规
 * （取 10Y/30Y 较大者，范围 0~30bp，阈值 +30bp）。
 * 剧本标签：利率冲击 1994·2013·2022。长端抛售触发时数值红色强调、状态点呼吸。 */
function RatesStrip({ m }: { m: Snapshot }) {
  const rates = m.rates_watch
  if (!rates) return null
  const live10 = rates.latest_quotes?.us10y
  const live30 = rates.latest_quotes?.us30y
  const main = live10?.value ?? rates.us10y?.value ?? live30?.value ?? rates.us30y?.value ?? null
  if (main == null) return null
  const qName = live10?.value != null || rates.us10y?.value != null ? '10Y' : '30Y'
  const active = !!rates.long_end_selloff?.active
  const srcQ = live10?.value != null ? live10 : (rates.us10y?.value != null ? rates.us10y : (live30?.value != null ? live30 : rates.us30y))
  const src = [srcLabel(srcQ?.source), mmdd(srcQ?.date)].filter(Boolean).join('·')
  const chg10 = rates.us10y?.change_20d_bp ?? rates.long_end_selloff?.us10y_change_20d_bp ?? null
  const chg30 = rates.us30y?.change_20d_bp ?? rates.long_end_selloff?.us30y_change_20d_bp ?? null
  const chg = chg10 != null && chg30 != null ? Math.max(chg10, chg30) : (chg10 ?? chg30)
  return (
    <div className={`sent${active ? ' sent-on' : ''}`} aria-label="美债收益率观察">
      <div className="sent-row">
        <span className={`oil-dot rates-dot${active ? ' on' : ''}`} aria-hidden="true" />
        <span className="sent-name">美债</span>
        <span className="sent-q">
          <span className="sent-q-name">{qName}</span>
          <b className="sent-val mono">{main.toFixed(2)}%</b>
        </span>
        {chg != null && (
          <b className={`sent-chg mono ${chgClsOf(chg, 30)}`}>
            {chgArrow(chg)}
            {Math.abs(chg).toFixed(0)}bp
          </b>
        )}
        <SentinelGauge
          value={chg}
          max={30}
          threshold={30}
          thresholdLabel="+30bp"
          ariaLabel={`长端收益率 20 日上行 ${chg != null ? `${chg.toFixed(0)}bp` : '—'}（取 10Y/30Y 较大者），抛售压力触发阈值 +30bp`}
        />
        <span className="sent-script">利率冲击 1994·2013·2022</span>
        {src && <span className="sent-src mono">{src}</span>}
      </div>
    </div>
  )
}

/** 黄金观察 · 第三条哨兵：现货读数 + 20 日涨幅迷你量规
 * （范围 0~8%，阈值 +8% 避险升温）。
 * 剧本标签：避险失灵 2008·2020。触发时数值红色强调、状态点呼吸。 */
function GoldStrip({ m }: { m: Snapshot }) {
  const gold = m.gold_watch
  const spot = gold?.spot
  if (!gold || !spot || spot.value == null) return null
  const active = !!gold.risk_off_signal?.active
  const chg = spot.change_20d_pct ?? gold.risk_off_signal?.change_20d_pct ?? null
  const src = [srcLabel(spot.source), mmdd(spot.date)].filter(Boolean).join('·')
  return (
    <div className={`sent${active ? ' sent-on' : ''}`} aria-label="黄金价格观察">
      <div className="sent-row">
        <span className={`oil-dot gold-dot${active ? ' on' : ''}`} aria-hidden="true" />
        <span className="sent-name">黄金</span>
        <span className="sent-q">
          <b className="sent-val mono">
            {spot.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </b>
        </span>
        {chg != null && (
          <b className={`sent-chg mono ${chgClsOf(chg, 8)}`}>
            {chgArrow(chg)}
            {Math.abs(chg).toFixed(1)}%
          </b>
        )}
        <SentinelGauge
          value={chg}
          max={8}
          threshold={8}
          thresholdLabel="+8%"
          ariaLabel={`金价 20 日涨幅 ${chg != null ? `${chg.toFixed(1)}%` : '—'}，避险升温触发阈值 +8%`}
        />
        <span className="sent-script">避险失灵 2008·2020</span>
        {src && <span className="sent-src mono">{src}</span>}
      </div>
    </div>
  )
}

function ThresholdTrack({ m }: { m: Snapshot }) {
  const pct = m.core?.baa10y_pct
  const curve = m.core?.curve_10y3m
  const inverted = m.core?.curve_inverted
  if (pct == null) return null
  const pos = Math.max(0, Math.min(100, pct))
  const gap = Math.max(0, 70 - pct)
  const mood = moodOf(70 - pct)
  return (
    <section aria-label="变灯距离" className="card reveal thresh" style={reveal(5)}>
      <h2>变灯距离 · 规则透明化</h2>
      <p className="sec-note">
        灯号规则冻结公开：核心分位 ≥70% 且曲线确认 → 黄灯；≥75% → 橙灯；≥92% → 红灯。
      </p>
      <p className="thresh-now">
        当前 BAA10Y 核心分位 <b className="mono">{pct.toFixed(1)}%</b>，距黄灯阈值 70% 还差{' '}
        <b className="mono">{gap.toFixed(1)}</b> 个百分点 ——{' '}
        <b className={mood.cls}>{mood.text}</b>
      </p>
      <div
        className="thresh-bar"
        role="img"
        aria-label={`当前分位 ${pct.toFixed(1)}%；黄灯阈值 70%，橙灯 75%，红灯 92%`}
      >
        <div className="thresh-track">
          <div className="thresh-fill" style={{ width: `${pos}%` }} />
          <span className="thresh-nowline" style={{ left: `${pos}%` }} />
          {THRESH_TICKS.map((t) => (
            <span key={t.v} className={`thresh-tick ${t.cls}`} style={{ left: `${t.v}%` }} />
          ))}
        </div>
        <div className="thresh-labels">
          <span style={{ left: '0%' }}>0</span>
          {THRESH_TICKS.map((t, i) => (
            <span
              key={t.v}
              className={`${t.cls}${i % 2 ? ' low' : ''}`}
              style={{ left: `${t.v}%` }}
            >
              {t.v} {t.name}
            </span>
          ))}
          <span style={{ left: '100%' }}>100</span>
        </div>
      </div>
      <p className="thresh-curve">
        曲线状态：
        {inverted
          ? `已倒挂（${curve != null ? curve.toFixed(2) : '—'}），已计入变灯确认`
          : `未倒挂（${curve != null ? `+${curve.toFixed(2)}` : '—'}），一旦倒挂即计入变灯确认`}
        。
      </p>
      <OilStrip m={m} />
      <RatesStrip m={m} />
      <GoldStrip m={m} />
    </section>
  )
}

/* ── 全球灯带（美国 + 九区域一排） ─────────────── */

/** 非绿色成员的异常一行：cycle 中"下行"维度（如 政策↓ 信贷↓）+
 * summary 里"："后的短句（约 20 字截断）。绿色成员不调用。 */
function regionAnomaly(region: RegionSnapshot): string {
  const downs = REGION_CYCLE_KEYS.filter((d) => region.cycle?.[d] === 'down').map(
    (d) => `${REGION_CYCLE_LABELS[d]}↓`,
  )
  const sum = region.summary || ''
  const after = sum.includes('：') ? sum.slice(sum.indexOf('：') + 1) : sum
  const short = after.length > 20 ? `${after.slice(0, 20)}…` : after
  return [...downs, short].filter(Boolean).join(' · ')
}

/** 灯带成员：国旗 + 名称 + 灯点（圆形）+ 灯色小字 + 可选数据滞后标记，
 * 副行仅"核心引擎"（美国）或非绿色成员的异常说明。 */
function BandItem({
  flag,
  name,
  light,
  sub,
  stale,
}: {
  flag: string
  name: string
  light: Light
  sub?: string
  stale?: boolean
}) {
  return (
    <li className="band-item">
      <div className="band-top">
        <span className="band-flag" aria-hidden="true">
          {flag}
        </span>
        <span className="band-name">{name}</span>
        <span className={`band-dot ${light}`} role="img" aria-label={LIGHT_TXT[light]} />
        <span className={`band-light lv-${light}`}>{LIGHT_SHORT[light]}灯</span>
        {stale && <span className="band-stale">数据滞后</span>}
      </div>
      {sub && <div className="band-sub">{sub}</div>}
    </li>
  )
}

export default function Home() {
  const { snapshot, briefs, loading, error } = useSnapshot()

  // 数据未就位：只显示品牌加载态，绝不渲染示例灯号，避免灯号跳变。
  if (loading) return <LoadingScreen />

  // 加载结束后：有真实数据用真实数据；失败才回退到 SAMPLE 并显著标注"示例数据"。
  const isSample = !snapshot
  const m = snapshot ?? SAMPLE
  const globalLight = asLight(m.global_light)
  const newsLink = m.news_link || 'https://finance.worldmonitor.app'
  // 灯带数据驱动：先按固定排序输出已知名称的区域，再兜底其余键。
  const regionKeys = m.regions
    ? [
        ...REGION_ORDER.filter((k) => m.regions?.[k]),
        ...Object.keys(m.regions).filter(
          (k) => !(REGION_ORDER as readonly string[]).includes(k),
        ),
      ]
    : []
  // 美国排第一（主灯），其余按灯严重度排序（红>橙>黄>绿），同级保持原顺序。
  const bandItems = regionKeys
    .map((k) => ({ key: k, region: m.regions![k], light: asLight(m.regions![k].light) }))
    .sort((a, b) => LIGHT_SEV[a.light] - LIGHT_SEV[b.light])

  return (
    <main className="page">
      <header className="brandbar reveal" style={reveal(0)}>
        <div className="brand">
          <img className="logo" src="assets/mosiq-mark.png" alt="MOSIQ" />
          <div>
            <div className="title">
              全球宏观罗盘 · 每日快照
              {isSample && <span className="sample">示例数据</span>}
            </div>
            <div className="sub">AI-NATIVE DECISION INTELLIGENCE</div>
          </div>
        </div>
        <div className="asof-top">
          截至 <span className="mono">{m.as_of || '—'}</span>
        </div>
      </header>

      <section className="hero reveal" style={reveal(1)} aria-label="全局风险灯号">
        <div className="hero-left">
          <RiskGauge light={globalLight} date={m.as_of} pct={m.core?.baa10y_pct} />
          <div className="hero-text">
            <span className={`hero-light lv-${globalLight}`}>{LIGHT_TXT[globalLight]}</span>
            <p className="hero-sub">
              BAA10Y 核心分位 + 10Y–3M 曲线为主触发器，复杂引擎为确认层 · 规则冻结 · 证据链可审计
            </p>
          </div>
        </div>
      </section>

      <section aria-label="全球灯带" className="card reveal" style={reveal(2)}>
        <h2>全球灯带 · 谁在亮灯</h2>
        <p className="sec-note">
          主灯监测全球危机震中（美国金融体系）；区域灯监测地方火情——1997亚洲、2010欧债都是区域先起火
        </p>
        <ul className="band">
          <BandItem flag="🇺🇸" name="美国" light={globalLight} sub="核心引擎" />
          {bandItems.map(({ key, region, light }) => (
            <BandItem
              key={key}
              flag={REGION_FLAGS[key] || '🏳'}
              name={REGION_NAMES[key] || key}
              light={light}
              stale={region.status !== 'ok'}
              sub={light === 'green' || light === 'unknown' ? undefined : regionAnomaly(region)}
            />
          ))}
        </ul>
      </section>

      <section className="concl reveal" style={reveal(3)} aria-label="创始人笔记">
        <div className="note">
          <img className="avatar" src="assets/grace-avatar.jpg" alt="Grace Yang" />
          <div className="note-body">
            <div className="who">Grace Yang · 创始人笔记</div>
            <blockquote>{displayNote(m)}</blockquote>
            {conclSupport(m) && <p className="concl-sub">{conclSupport(m)}</p>}
          </div>
        </div>
      </section>

      {m.world_brief && m.world_brief.length > 0 && (
        <section className="world-brief reveal" style={reveal(4)} aria-label="今日世界">
          <span className="wb-lead">今日世界</span>
          <ul className="wb-list">
            {m.world_brief.map((item, i) => (
              <li key={i}>
                <a
                  className="wb-row"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={`wb-chip ${wbCatClass(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="wb-title">{item.title}</span>
                  <span className="wb-meta">
                    {item.source}
                    {relTime(item.published) ? ` · ${relTime(item.published)}` : ''}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ThresholdTrack m={m} />

      <section aria-label="危机雷达" className="card reveal" style={reveal(6)}>
        <h2>危机雷达 · 美国金融四部位</h2>
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
            <dd>
              {m.core?.baa10y == null ? (
                '—'
              ) : (
                <CountUp value={m.core.baa10y} format={(v) => `${v.toFixed(2)}%`} />
              )}
            </dd>
            <dd className="cap">美国低评级企业借债比国债多付的利息，危机前会快速飙升</dd>
          </dl>
          <dl>
            <dt>历史分位</dt>
            <dd>
              {m.core?.baa10y_pct == null ? (
                '—'
              ) : (
                <CountUp value={m.core.baa10y_pct} format={(v) => `${v.toFixed(0)}%`} />
              )}
            </dd>
            <dd className="cap">当前利差在历史中的位置，越高越危险，≥70% 触发黄灯</dd>
          </dl>
          <dl>
            <dt>10Y–3M 曲线</dt>
            <dd>
              {m.core?.curve_10y3m == null ? (
                '—'
              ) : (
                <CountUp
                  value={m.core.curve_10y3m}
                  format={(v) =>
                    `${v > 0 ? '+' : ''}${v.toFixed(2)}${m.core?.curve_inverted ? '（倒挂）' : ''}`
                  }
                />
              )}
            </dd>
            <dd className="cap">长短期国债利差，变成负数（倒挂）是最可靠的衰退预警之一</dd>
          </dl>
        </div>
        <p className="core-fresh">核心信号均为日频 · 最近交易日</p>
      </section>

      <section aria-label="周期状态" className="card reveal" style={reveal(7)}>
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

      <div className="grid-2 reveal" style={reveal(8)}>
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
          <h2>监测建议</h2>
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
        <section aria-label="今日事件" className="card reveal" style={reveal(9)}>
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

      <section aria-label="灯号使用说明" className="card guide reveal" style={reveal(10)}>
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

      <footer className="foot reveal" style={reveal(11)}>
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
