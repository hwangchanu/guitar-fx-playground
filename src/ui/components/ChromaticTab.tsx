import { useState } from 'react'
import { useChromatic } from '../hooks/useChromatic'
import { canRecord } from '../../audio/chromatic/recorder'
import { MetronomeControls } from './MetronomeControls'
import { AudioUpload } from './AudioUpload'
import { TimingGrid } from './TimingGrid'
import { AnalysisReport } from './AnalysisReport'
import { HelpCircle, Mic, Disc, Loader2 } from 'lucide-react'

export function ChromaticTab() {
  const {
    state,
    startSession,
    stopSession,
    analyzeFile,
    getCurrentBeat,
    reset,
    setBpm,
    setBeats,
    setSubdivisions,
    setCountIn,
  } = useChromatic()

  const [canRecordAudio] = useState(() => canRecord())

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      {/* 1. 상단 컨트롤 패널 */}
      <MetronomeControls
        bpm={state.bpm}
        beats={state.beats}
        subdivisions={state.subdivisions}
        countIn={state.countIn}
        phase={state.phase}
        canRecordAudio={canRecordAudio}
        onStartSession={startSession}
        onStopSession={stopSession}
        onSetBpm={setBpm}
        onSetBeats={setBeats}
        onSetSubdivisions={setSubdivisions}
        onSetCountIn={setCountIn}
        onReset={reset}
        getCurrentBeat={getCurrentBeat}
      />

      {/* 2. 메인 작업 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 드래그 앤 드롭 업로드 */}
        <div className="lg:col-span-1 space-y-4">
          <AudioUpload
            disabled={state.phase !== 'idle' && state.phase !== 'result'}
            onFile={analyzeFile}
          />
          {state.fileName && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-400 font-mono break-all flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              <span>업로드 분석 대상: {state.fileName}</span>
            </div>
          )}
        </div>

        {/* 오른쪽 영역: 실시간 상태에 따른 화면 구성 */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 min-h-[220px] flex flex-col justify-center">
          {state.phase === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-300 border-b border-zinc-800 pb-2">
                <HelpCircle className="h-4.5 w-4.5 text-teal-400" />
                <h4 className="font-semibold text-sm uppercase tracking-wider">크로매틱 연습 안내</h4>
              </div>
              <ul className="space-y-2 text-xs text-zinc-400 leading-relaxed list-decimal list-inside">
                <li>
                  원하는 템포(BPM), 박자, 그리고 한 박당 연주할 음의 세분화(Subdivisions)를 세팅합니다.
                </li>
                <li>
                  <strong className="text-zinc-200">실시간 녹음 모드:</strong> [실시간 녹음 연습 시작]을 클릭하면 메트로놈 카운트인(BPM 소리)이 들립니다. 카운트인이 끝나는 타이밍에 맞춰 크로매틱 운지(예: 1-2-3-4 등) 리프를 정확하게 메트로놈 클릭에 태우며 연주해 주세요. 연주를 마치면 [연습 완료 & 분석 시작] 버튼을 누릅니다.
                </li>
                <li>
                  <strong className="text-zinc-200">파일 업로드 모드:</strong> 다른 녹음기 앱이나 오디오 카드 DI 채널을 통해 메트로놈에 맞춰 녹음해 둔 크로매틱 WAV / MP3 파일을 왼쪽 업로드박스로 드래그해 분석할 수 있습니다.
                </li>
                <li>
                  분석은 순수 알고리즘으로 실행되며, 타이밍 편차(ms 단위), 옥타브 기준 피치 추적, 그리고 피킹 시의 볼륨 균일성을 체크해 요약 보고서를 보여줍니다.
                </li>
              </ul>
            </div>
          )}

          {state.phase === 'countIn' && (
            <div className="text-center py-6 space-y-3">
              <div className="relative mx-auto h-16 w-16 flex items-center justify-center">
                <div className="absolute h-full w-full rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                <Mic className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-sm font-semibold text-orange-400 animate-pulse">카운트다운 재생 중...</p>
              <p className="text-xs text-zinc-500">카운트인이 끝나면 녹음이 자동으로 시작됩니다. 기타 볼륨을 켜고 대기하세요.</p>
            </div>
          )}

          {state.phase === 'recording' && (
            <div className="text-center py-6 space-y-3">
              <div className="relative mx-auto h-16 w-16 flex items-center justify-center">
                <div className="absolute h-full w-full rounded-full border-4 border-rose-500/20 border-t-rose-600 animate-spin" />
                <Disc className="h-6 w-6 text-rose-500 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-rose-500">실시간 녹음 연습 진행 중...</p>
              <p className="text-xs text-zinc-400">메트로놈 템포와 박자 스텝에 맞춰 일렉/어쿠스틱 기타 크로매틱 운지를 하세요.</p>
            </div>
          )}

          {state.phase === 'analyzing' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-10 w-10 text-teal-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-teal-400">오디오 데이터 분석 알고리즘 가동 중</p>
              <p className="text-xs text-zinc-500">주파수 자기상관관계 계산(Autocorrelation) 및 온셋 에너지 차트를 분석하는 중입니다...</p>
            </div>
          )}

          {state.phase === 'result' && state.analysis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">박자 정밀도 그리드</span>
                <span className="text-[10px] text-zinc-500 font-mono">총 {state.analysis.notes.length}음 감지됨</span>
              </div>
              <TimingGrid timing={state.analysis.timing} />
            </div>
          )}
        </div>
      </div>

      {/* 3. 하단 상세 진단서 리포트 */}
      {state.phase === 'result' && state.analysis && (
        <div className="mt-8 transition-opacity duration-300">
          <AnalysisReport analysis={state.analysis} />
        </div>
      )}
    </div>
  )
}
