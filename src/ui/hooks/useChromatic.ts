// src/ui/hooks/useChromatic.ts
// React ↔ 크로매틱 엔진 브리지.
// 메트로놈·녹음·분석 인스턴스는 useRef로 보존. 상태는 useReducer가 단일 출처.

import { useReducer, useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'
import { chromaticReducer, initialChromatic } from '../state/chromaticReducer'
import { createMetronome, type Metronome } from '../../audio/chromatic/metronome'
import { startRecording, type RecordingResult } from '../../audio/chromatic/recorder'
import { analyzeChromatic } from '../../audio/chromatic/analyzer'

export function useChromatic() {
  const [state, dispatch] = useReducer(chromaticReducer, initialChromatic)
  const metronomeRef = useRef<Metronome | null>(null)
  const recorderStopRef = useRef<(() => Promise<RecordingResult>) | null>(null)

  // 1. 컴포넌트 마운트 시 메트로놈 생성 및 언마운트 시 정리
  useEffect(() => {
    const met = createMetronome({
      bpm: state.bpm,
      beats: state.beats,
      countIn: state.countIn,
    })
    metronomeRef.current = met

    return () => {
      met.dispose()
      metronomeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. 상태(bpm, beats, countIn)가 바뀔 때 메트로놈 설정 동기화
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBpm(state.bpm)
    }
  }, [state.bpm])

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBeats(state.beats)
    }
  }, [state.beats])

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setCountIn(state.countIn)
    }
  }, [state.countIn])

  // 3. 카운트인 시작 → 카운트인 끝나면 자동 녹음 시작
  const startSession = useCallback(async () => {
    try {
      await Tone.start()

      if (!metronomeRef.current) {
        metronomeRef.current = createMetronome({
          bpm: state.bpm,
          beats: state.beats,
          countIn: state.countIn,
        })
      }

      dispatch({ type: 'startCountIn' })

      await metronomeRef.current.start(async () => {
        // 카운트인 완료 콜백 -> 실시간 녹음 개시
        dispatch({ type: 'startRecording' })

        try {
          const rec = await startRecording()
          recorderStopRef.current = rec.stop
        } catch (err) {
          console.error('녹음 시작 실패:', err)
          if (metronomeRef.current) {
            metronomeRef.current.stop()
          }
          dispatch({ type: 'reset' })
          alert('마이크 접근 권한이 없거나 오디오 입력을 시작할 수 없습니다. 파일 업로드 분석 방식을 대신 사용해 보세요.')
        }
      })
    } catch (err) {
      console.error('세션 시작 실패:', err)
      dispatch({ type: 'reset' })
    }
  }, [state.bpm, state.beats, state.countIn])

  // 4. 녹음 중지 → 분석 시작
  const stopSession = useCallback(async () => {
    if (metronomeRef.current) {
      metronomeRef.current.stop()
    }

    dispatch({ type: 'startAnalysis' })

    if (recorderStopRef.current) {
      try {
        const result = await recorderStopRef.current()
        recorderStopRef.current = null

        // 동기 오프라인 분석 실행
        const analysis = analyzeChromatic(result.samples, {
          sampleRate: result.sampleRate,
          bpm: state.bpm,
          subdivisions: state.subdivisions,
        })

        dispatch({ type: 'setResult', analysis })
      } catch (err) {
        console.error('녹음 디코딩 또는 분석 실패:', err)
        dispatch({ type: 'reset' })
        alert('오디오를 디코딩하고 분석하는 중에 오류가 발생했습니다.')
      }
    } else {
      dispatch({ type: 'reset' })
    }
  }, [state.bpm, state.subdivisions])

  // 5. 외부 파일 드롭/선택 분석
  const analyzeFile = useCallback(async (file: File) => {
    dispatch({ type: 'startAnalysis', fileName: file.name })

    try {
      const arrayBuffer = await file.arrayBuffer()
      
      interface LegacyWindow extends Window {
        webkitAudioContext?: typeof AudioContext
      }
      const AudioContextClass = window.AudioContext || (window as unknown as LegacyWindow).webkitAudioContext
      const audioCtx = new AudioContextClass()

      audioCtx.decodeAudioData(
        arrayBuffer,
        async (audioBuffer) => {
          try {
            const samples = audioBuffer.getChannelData(0)
            const samplesCopy = new Float32Array(samples)
            
            await audioCtx.close()

            const analysis = analyzeChromatic(samplesCopy, {
              sampleRate: audioBuffer.sampleRate,
              bpm: state.bpm,
              subdivisions: state.subdivisions,
            })

            dispatch({ type: 'setResult', analysis })
          } catch (err) {
            console.error('파일 분석 처리 에러:', err)
            dispatch({ type: 'reset' })
            alert('파일 분석 과정 중 오류가 발생했습니다.')
          }
        },
        (err) => {
          console.error('파일 디코딩 실패:', err)
          dispatch({ type: 'reset' })
          alert('오디오 파일 디코딩에 실패했습니다. 올바른 포맷(WAV, MP3)인지 확인하세요.')
        }
      )
    } catch (err) {
      console.error('파일 로드 실패:', err)
      dispatch({ type: 'reset' })
      alert('오디오 파일을 읽는 데 실패했습니다.')
    }
  }, [state.bpm, state.subdivisions])

  // 6. UI의 플레이헤드 등 갱신을 위해 현재 비트 인덱스 반환 (0-based)
  const getCurrentBeat = useCallback(() => {
    return metronomeRef.current?.getCurrentBeat() ?? -1
  }, [])

  return {
    state,
    startSession,
    stopSession,
    analyzeFile,
    getCurrentBeat,
    reset: () => dispatch({ type: 'reset' }),
    setBpm: (v: number) => dispatch({ type: 'setBpm', value: v }),
    setBeats: (v: number) => dispatch({ type: 'setBeats', value: v }),
    setSubdivisions: (v: number) => dispatch({ type: 'setSubdivisions', value: v }),
    setCountIn: (v: number) => dispatch({ type: 'setCountIn', value: v }),
  }
}
