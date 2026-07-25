import { useEffect, useState } from 'react'
import type { BriefsFile, Snapshot } from '../types/snapshot'

interface SnapshotState {
  snapshot: Snapshot | null
  briefs: BriefsFile | null
  loading: boolean
  error: string | null
}

/** 读取每日快照（data/snapshot.json）与可选的 worldmonitor 简报
 * （data/briefs.json）。简报文件不存在时静默隐藏对应区域。
 */
export function useSnapshot(): SnapshotState {
  const [state, setState] = useState<SnapshotState>({
    snapshot: null,
    briefs: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const snapResp = await fetch('data/snapshot.json', { cache: 'no-store' })
        if (!snapResp.ok) throw new Error(`snapshot ${snapResp.status}`)
        const snapshot = (await snapResp.json()) as Snapshot

        let briefs: BriefsFile | null = null
        try {
          const briefResp = await fetch('data/briefs.json', { cache: 'no-store' })
          if (briefResp.ok) briefs = (await briefResp.json()) as BriefsFile
        } catch {
          briefs = null // 预留接口：文件缺失属正常状态
        }

        if (!cancelled) setState({ snapshot, briefs, loading: false, error: null })
      } catch (err) {
        if (!cancelled) {
          setState({
            snapshot: null,
            briefs: null,
            loading: false,
            error: err instanceof Error ? err.message : 'load failed',
          })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
