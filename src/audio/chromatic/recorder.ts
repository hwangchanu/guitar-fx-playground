// src/audio/chromatic/recorder.ts
// 브라우저 마이크 녹음. getUserMedia로 스트림을 열고 MediaRecorder로 녹음.
// 분석 모듈은 디코딩된 Float32Array(PCM)을 받으므로, 녹음 완료 후 AudioContext.decodeAudioData로 변환.

export interface RecordingResult {
  /** 모노 PCM 샘플 (-1..1). 스테레오 입력이면 첫 채널만 사용. */
  samples: Float32Array
  sampleRate: number
  durationSec: number
}

/** getUserMedia 가용 여부 (HTTPS/localhost + 권한). */
export function canRecord(): boolean {
  return !!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/** 마이크 스트림을 열고 녹음을 시작한다. stop()을 호출하면 RecordingResult를 resolve. */
export async function startRecording(): Promise<{
  stop: () => Promise<RecordingResult>
}> {
  if (!canRecord()) {
    throw new Error('마이크 녹음을 지원하지 않는 브라우저이거나 보안 컨텍스트(HTTPS)가 아닙니다.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  
  // 브라우저별 코덱 지원 여부 확인
  let options = {}
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options = { mimeType: 'audio/webm;codecs=opus' }
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      options = { mimeType: 'audio/ogg;codecs=opus' }
    }
  }
  
  const mediaRecorder = new MediaRecorder(stream, options)
  const chunks: Blob[] = []
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data)
    }
  }
  
  mediaRecorder.start()
  
  return {
    stop: () => {
      return new Promise<RecordingResult>((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          try {
            // 마이크 스트림 트랙 즉시 해제하여 녹음 종료 표시
            stream.getTracks().forEach(track => track.stop())
            
            if (chunks.length === 0) {
              throw new Error('녹음된 오디오 데이터가 없습니다.')
            }

            const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
            const arrayBuffer = await blob.arrayBuffer()
            
            // 디코딩을 위한 전용 오디오 컨텍스트 생성 및 정리
            interface LegacyWindow extends Window {
              webkitAudioContext?: typeof AudioContext
            }
            const AudioContextClass = window.AudioContext || (window as unknown as LegacyWindow).webkitAudioContext
            const audioCtx = new AudioContextClass()
            
            audioCtx.decodeAudioData(arrayBuffer, async (audioBuffer) => {
              try {
                // 모노 채널(0번 채널) 추출
                const samples = audioBuffer.getChannelData(0)
                // 복사본을 만들어 메모리 누수 방지 (가끔 decodeAudioData 버퍼가 소멸될 수 있으므로)
                const samplesCopy = new Float32Array(samples)
                
                await audioCtx.close()
                
                resolve({
                  samples: samplesCopy,
                  sampleRate: audioBuffer.sampleRate,
                  durationSec: audioBuffer.duration
                })
              } catch (err) {
                reject(err)
              }
            }, (err) => {
              reject(err)
            })
          } catch (err) {
            reject(err)
          }
        }
        
        mediaRecorder.stop()
      })
    }
  }
}
