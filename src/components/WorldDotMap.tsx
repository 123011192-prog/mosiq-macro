import { useEffect, useMemo, useRef } from 'react'
import type { RegionSnapshot } from '../types/snapshot'
import { WORLD_DOTS, WORLD_GRID_H, WORLD_GRID_W } from '../data/world-dots'
import { useReducedMotion } from '../hooks/use-reduced-motion'
import {
  asLight,
  DIR_ARROW,
  DIR_TXT,
  LIGHT_SHORT,
  REGION_CYCLE_KEYS,
  REGION_CYCLE_LABELS,
  REGION_GEO,
  REGION_NAMES,
} from './region-shared'

interface WorldDotMapProps {
  regions: Record<string, RegionSnapshot>
  order: readonly string[]
  active: string | null
  onActive: (key: string | null) => void
}

/** 抽象点阵世界地图：canvas 绘制陆地点阵（无国界、无地名），
 * 区域灯号以 HTML 脉冲光点叠加（点击区域 ≥44px，移动端可点）。
 * hover / 点击光点显示该区域速览面板。 */
export default function WorldDotMap({ regions, order, active, onActive }: WorldDotMapProps) {
  const reduced = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 陆地点阵（栅格坐标），以及确定性打散后的入场顺序
  const dots = useMemo(() => {
    const list: Array<[number, number]> = []
    WORLD_DOTS.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '#') list.push([i + 0.5, j + 0.5])
      }
    })
    return list
  }, [])
  const orderRef = useRef<number[]>([])
  if (orderRef.current.length !== dots.length) {
    // 线性同余伪随机打散（固定种子，首屏表现稳定）
    const idx = dots.map((_, i) => i)
    let seed = 20260724
    for (let i = idx.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) % 2147483648
      const j = seed % (i + 1)
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    orderRef.current = idx
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const draw = (revealCount: number, fade: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth * dpr
      const h = (w * WORLD_GRID_H) / WORLD_GRID_W
      if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) {
        canvas.width = Math.round(w)
        canvas.height = Math.round(h)
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cell = canvas.width / WORLD_GRID_W
      const r = cell * 0.32
      ctx.fillStyle = '#a3b4c9'
      const n = dots.length
      for (let k = 0; k < n; k++) {
        const pos = orderRef.current[k]
        const appearAt = (k / n) * 0.75
        const alpha = reduced ? 1 : Math.max(0, Math.min(1, (fade - appearAt) / 0.25))
        if (alpha <= 0) continue
        if (k >= revealCount) continue
        const [gx, gy] = dots[pos]
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(gx * cell, gy * cell, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    if (reduced) {
      draw(dots.length, 1)
      const onResize = () => draw(dots.length, 1)
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900)
      draw(dots.length, p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onResize = () => draw(dots.length, 1)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [dots, reduced])

  const activeRegion = active ? regions[active] : undefined
  const activeLight = activeRegion ? asLight(activeRegion.light) : 'unknown'

  return (
    <div className="map-block">
      <div className="map" onMouseLeave={() => onActive(null)}>
        <canvas
          ref={canvasRef}
          className="map-canvas"
          style={{ aspectRatio: `${WORLD_GRID_W} / ${WORLD_GRID_H}` }}
          role="img"
          aria-label="抽象点阵世界地图，标注欧元区、中国、日本、韩国四个区域的风险灯号"
        />
        {order
          .filter((k) => regions[k] && REGION_GEO[k])
          .map((k) => {
            const [lon, lat] = REGION_GEO[k]
            const light = asLight(regions[k].light)
            return (
              <button
                type="button"
                key={k}
                className={`map-marker m-${light}${active === k ? ' on' : ''}`}
                style={{
                  left: `${(((lon + 180) / 360) * 100).toFixed(2)}%`,
                  top: `${(((90 - lat) / 180) * 100).toFixed(2)}%`,
                }}
                onMouseEnter={() => onActive(k)}
                onFocus={() => onActive(k)}
                onClick={() => onActive(active === k ? null : k)}
                aria-label={`${REGION_NAMES[k] || k}：${LIGHT_SHORT[light]}灯`}
              >
                <span className="map-pulse" aria-hidden="true" />
              </button>
            )
          })}
      </div>

      {active && activeRegion && (
        <div className={`map-panel mp-${activeLight}`} role="status">
          <div className="map-panel-head">
            <span className="map-panel-name">{REGION_NAMES[active] || active}</span>
            <span className="region-light">
              <span className={`px ${activeLight}`} aria-hidden="true" />
              <span className={`lv-${activeLight}`}>{LIGHT_SHORT[activeLight]}灯</span>
            </span>
          </div>
          {activeRegion.summary && <p className="map-panel-sum">{activeRegion.summary}</p>}
          <div className="map-panel-cyc">
            {REGION_CYCLE_KEYS.map((dim) => {
              const dir = activeRegion.cycle?.[dim] || 'neutral'
              const cls =
                dir === 'up'
                  ? 's-up'
                  : dir === 'down'
                    ? 's-down'
                    : dir === 'degraded'
                      ? 's-degraded'
                      : 's-neutral'
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
        </div>
      )}
    </div>
  )
}
