// 페달 팩토리(Tone 노드 생성). 브라우저에서만 로드된다(엔진이 import).
// 각 팩토리의 setParam id는 specs.ts의 ParamSpec id와 일치해야 한다.
import * as Tone from 'tone'
import type { PedalFactory, PedalInstance } from './Pedal'

const createOverdrive: PedalFactory = (): PedalInstance => {
  const node = new Tone.Distortion({ distortion: 0.4, wet: 1 })
  return {
    input: node,
    output: node,
    setParam(id, v) {
      if (id === 'drive') node.distortion = v
      else if (id === 'mix') node.wet.value = v
    },
    dispose() {
      node.dispose()
    },
  }
}

const createDelay: PedalFactory = (): PedalInstance => {
  const node = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.35, wet: 0.4 })
  return {
    input: node,
    output: node,
    setParam(id, v) {
      if (id === 'time') node.delayTime.value = v
      else if (id === 'feedback') node.feedback.value = v
      else if (id === 'mix') node.wet.value = v
    },
    dispose() {
      node.dispose()
    },
  }
}

const createReverb: PedalFactory = (): PedalInstance => {
  const node = new Tone.Reverb({ decay: 2, wet: 0.4 })
  return {
    input: node,
    output: node,
    setParam(id, v) {
      if (id === 'decay') {
        node.decay = v
        void node.generate() // decay 변경은 IR 재생성이 필요
      } else if (id === 'mix') {
        node.wet.value = v
      }
    },
    dispose() {
      node.dispose()
    },
  }
}

const createCompressor: PedalFactory = (): PedalInstance => {
  const comp = new Tone.Compressor({ threshold: -24, ratio: 4 })
  // 메이크업 게인: 컴프레서는 누르기만 하므로 고정 부스트로 "단단해지는" 효과를 들리게 한다.
  const makeup = new Tone.Gain(6, 'decibels')
  comp.connect(makeup)
  return {
    input: comp,
    output: makeup,
    setParam(id, v) {
      if (id === 'threshold') comp.threshold.value = v
      else if (id === 'ratio') comp.ratio.value = v
    },
    dispose() {
      comp.dispose()
      makeup.dispose()
    },
  }
}

const createChorus: PedalFactory = (): PedalInstance => {
  // Chorus는 LFO 기반이라 .start()로 모듈레이션을 시작해야 한다.
  const node = new Tone.Chorus({ frequency: 1.5, depth: 0.7, wet: 0.5 }).start()
  return {
    input: node,
    output: node,
    setParam(id, v) {
      if (id === 'rate') node.frequency.value = v
      else if (id === 'depth') node.depth = v
      else if (id === 'mix') node.wet.value = v
    },
    dispose() {
      node.dispose()
    },
  }
}

const createFilter: PedalFactory = (): PedalInstance => {
  const node = new Tone.Filter({ frequency: 1200, type: 'lowpass', Q: 1 })
  return {
    input: node,
    output: node,
    setParam(id, v) {
      if (id === 'frequency') node.frequency.value = v
      else if (id === 'resonance') node.Q.value = v
    },
    dispose() {
      node.dispose()
    },
  }
}

export const PEDAL_FACTORIES: Record<string, PedalFactory> = {
  overdrive: createOverdrive,
  delay: createDelay,
  reverb: createReverb,
  compressor: createCompressor,
  chorus: createChorus,
  filter: createFilter,
}
