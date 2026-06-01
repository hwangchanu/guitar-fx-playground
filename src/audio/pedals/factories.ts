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

export const PEDAL_FACTORIES: Record<string, PedalFactory> = {
  overdrive: createOverdrive,
  delay: createDelay,
  reverb: createReverb,
}
