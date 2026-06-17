// React ↔ PedalboardEngine 브리지.
// 엔진은 useRef로 단일 인스턴스 보존(렌더마다 재생성 금지), 상태는 useReducer가 단일
// 출처. 상태가 바뀌면 effect에서 engine.reconcile을 호출한다.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { PedalboardEngine } from '../../audio/PedalboardEngine'
import { createSequencerSource } from '../../audio/sources/sequencerSource'
import type { SequencerSource } from '../../audio/sources/sequencerSource'
import { pedalboardReducer, initialPedalboard } from '../state/pedalboardReducer'
import { sequencerReducer, initialSequencer, type SequencerState } from '../state/sequencerReducer'
import { decodeShare, encodeShare } from '../state/shareCodec'
import type { PedalboardState } from '../../audio/types'

// 마운트 시 URL 해시(#…)에 공유 토큰이 있으면 복원, 없거나 깨졌으면 기본값.
function readInitialState(): { board: PedalboardState; seq: SequencerState } {
  if (typeof window !== 'undefined') {
    const token = window.location.hash.replace(/^#/, '')
    if (token) {
      const decoded = decodeShare(token)
      if (decoded) return decoded
    }
  }
  return { board: initialPedalboard, seq: initialSequencer }
}

export function useEngine() {
  const engineRef = useRef<PedalboardEngine | null>(null)
  const sourceRef = useRef<SequencerSource | null>(null)
  // 공유 URL → 초기 상태(1회 계산). 소스 동기화는 기존 setPattern/setBpm effect가 마운트 때 수행.
  const [initial] = useState(readInitialState)
  const [state, dispatch] = useReducer(pedalboardReducer, initial.board)
  const [seq, seqDispatch] = useReducer(sequencerReducer, initial.seq)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // 음원 = 스텝 시퀀서. 복원된 초기 상태(공유 URL 또는 기본 리프)로 바로 생성한다
    // — effect 실행 순서에 의존하지 않도록(initial은 useState로 고정된 1회 값).
    const source = createSequencerSource(initial.seq.cells, initial.seq.bpm)
    const engine = new PedalboardEngine(source)
    sourceRef.current = source
    engineRef.current = engine
    return () => {
      engine.dispose() // 엔진 dispose가 source.dispose()까지 수행
      engineRef.current = null
      sourceRef.current = null
    }
  }, [initial])

  useEffect(() => {
    engineRef.current?.reconcile(state)
  }, [state])

  // 시퀀스 편집을 음원에 푸시 (Tone 노드 재생성 없이 즉시 반영)
  useEffect(() => {
    sourceRef.current?.setPattern(seq.cells)
  }, [seq.cells])
  useEffect(() => {
    sourceRef.current?.setBpm(seq.bpm)
  }, [seq.bpm])

  const play = async () => {
    await engineRef.current?.play()
    setPlaying(true)
  }
  const stop = () => {
    engineRef.current?.stop()
    setPlaying(false)
  }
  // 시각화용: 매 프레임 호출되므로 안정적 identity 유지(엔진/소스 ref만 읽음).
  const getWaveform = useCallback(() => engineRef.current?.getWaveform() ?? null, [])
  const getSpectrum = useCallback(() => engineRef.current?.getSpectrum() ?? null, [])
  const getSampleRate = useCallback(() => engineRef.current?.getSampleRate() ?? 48000, [])
  const getStep = useCallback(() => sourceRef.current?.getCurrentStep() ?? -1, [])

  // 현재 페달보드 + 시퀀스를 공유 가능한 URL로. (호출 시점 상태를 인코딩 — 매 프레임 호출 아님)
  const shareUrl = useCallback(() => {
    const token = encodeShare(state, seq)
    const { origin, pathname } = window.location
    return `${origin}${pathname}#${token}`
  }, [state, seq])

  return {
    state,
    playing,
    play,
    stop,
    shareUrl,
    getWaveform,
    getSpectrum,
    getSampleRate,
    // 훅이 id의 정식 출처다(추가한 페달을 즉시 선택하려면 id가 동기적으로 필요).
    // reducer.createPedal의 `?? crypto.randomUUID()`는 직접 호출용 폴백일 뿐.
    addPedal: (kind: string): string => {
      const id = crypto.randomUUID()
      dispatch({ type: 'add', kind, id })
      return id
    },
    removePedal: (id: string) => dispatch({ type: 'remove', id }),
    reorder: (from: number, to: number) => dispatch({ type: 'reorder', from, to }),
    toggleBypass: (id: string) => dispatch({ type: 'toggleBypass', id }),
    setParam: (id: string, paramId: string, value: number) =>
      dispatch({ type: 'setParam', id, paramId, value }),
    // 미디 찍기 (스텝 시퀀서)
    sequencer: {
      cells: seq.cells,
      bpm: seq.bpm,
      toggleCell: (row: number, step: number) => seqDispatch({ type: 'toggleCell', row, step }),
      clear: () => seqDispatch({ type: 'clear' }),
      loadDefault: () => seqDispatch({ type: 'loadDefault' }),
      setBpm: (value: number) => seqDispatch({ type: 'setBpm', value }),
      getStep,
    },
  }
}
