// React ↔ PedalboardEngine 브리지.
// 엔진은 useRef로 단일 인스턴스 보존(렌더마다 재생성 금지), 상태는 useReducer가 단일
// 출처. 상태가 바뀌면 effect에서 engine.reconcile을 호출한다.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { PedalboardEngine } from '../../audio/PedalboardEngine'
import { createSequencerSource } from '../../audio/sources/sequencerSource'
import type { SequencerSource } from '../../audio/sources/sequencerSource'
import { pedalboardReducer, initialPedalboard } from '../state/pedalboardReducer'
import { sequencerReducer, initialSequencer } from '../state/sequencerReducer'

export function useEngine() {
  const engineRef = useRef<PedalboardEngine | null>(null)
  const sourceRef = useRef<SequencerSource | null>(null)
  const [state, dispatch] = useReducer(pedalboardReducer, initialPedalboard)
  const [seq, seqDispatch] = useReducer(sequencerReducer, initialSequencer)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // 음원 = 스텝 시퀀서(기본 패턴 = 프리셋 리프). 음원은 교체 가능한 모듈.
    const source = createSequencerSource(initialSequencer.cells, initialSequencer.bpm)
    const engine = new PedalboardEngine(source)
    sourceRef.current = source
    engineRef.current = engine
    return () => {
      engine.dispose() // 엔진 dispose가 source.dispose()까지 수행
      engineRef.current = null
      sourceRef.current = null
    }
  }, [])

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
  const getStep = useCallback(() => sourceRef.current?.getCurrentStep() ?? -1, [])

  return {
    state,
    playing,
    play,
    stop,
    getWaveform,
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
