// 1단계 실제 음원: 프리셋 기타 DI 루프를 반복 재생.
// public/audio/ 에 클린 기타 DI 루프 파일을 넣고 url을 주입한다.
import * as Tone from 'tone'
import type { Source } from './Source'

export function createLoopSource(url: string): Source {
  const player = new Tone.Player({ url, loop: true })
  return {
    output: player,
    play() {
      if (player.loaded) player.start()
    },
    stop() {
      if (player.state === 'started') player.stop()
    },
    dispose() {
      player.dispose()
    },
  }
}
