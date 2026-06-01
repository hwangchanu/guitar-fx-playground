// React ↔ PedalboardEngine 브리지.
// 엔진은 useRef로 단일 인스턴스 보존(렌더마다 재생성 금지), 상태는 useReducer가 단일
// 출처. 상태가 바뀌면 effect에서 engine.reconcile을 호출한다.
import { useEffect, useReducer, useRef, useState } from 'react'
import { PedalboardEngine } from '../../audio/PedalboardEngine'
import { createSamplerSource } from '../../audio/sources/samplerSource'
import { pedalboardReducer, initialPedalboard } from '../state/pedalboardReducer'

export function useEngine() {
  const engineRef = useRef<PedalboardEngine | null>(null)
  const [state, dispatch] = useReducer(pedalboardReducer, initialPedalboard)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // 샘플드 클린 일렉기타(FreePats CC0) 리프. 음원은 교체 가능한 모듈이라 한 줄만 바꾸면 됨.
    const engine = new PedalboardEngine(createSamplerSource())
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.reconcile(state)
  }, [state])

  const play = async () => {
    await engineRef.current?.play()
    setPlaying(true)
  }
  const stop = () => {
    engineRef.current?.stop()
    setPlaying(false)
  }

  return {
    state,
    playing,
    play,
    stop,
    addPedal: (kind: string) => dispatch({ type: 'add', kind }),
    removePedal: (id: string) => dispatch({ type: 'remove', id }),
    reorder: (from: number, to: number) => dispatch({ type: 'reorder', from, to }),
    toggleBypass: (id: string) => dispatch({ type: 'toggleBypass', id }),
    setParam: (id: string, paramId: string, value: number) =>
      dispatch({ type: 'setParam', id, paramId, value }),
  }
}
