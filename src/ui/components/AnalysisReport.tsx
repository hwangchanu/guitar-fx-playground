import type { ChromaticAnalysis } from '../../audio/chromatic/types'
import { Award, Zap, Activity, Clock } from 'lucide-react'

interface Props {
  analysis: ChromaticAnalysis
}

export function AnalysisReport({ analysis }: Props) {
  const { overallScore, timing, dynamics, summary } = analysis
  
  // 1. 점수 구간별 색상 결정
  let scoreColorClass = 'text-rose-500 stroke-rose-500'
  let scoreBgClass = 'bg-rose-500/10 border-rose-900/30'
  if (overallScore >= 90) {
    scoreColorClass = 'text-lime-400 stroke-lime-400'
    scoreBgClass = 'bg-lime-500/10 border-lime-900/30'
  } else if (overallScore >= 70) {
    scoreColorClass = 'text-amber-400 stroke-amber-400'
    scoreBgClass = 'bg-amber-500/10 border-amber-900/30'
  } else if (overallScore >= 50) {
    scoreColorClass = 'text-orange-500 stroke-orange-500'
    scoreBgClass = 'bg-orange-500/10 border-orange-900/30'
  }

  // 2. 타이밍 판정 카운트 및 비율 계산
  const totalNotes = timing.judgments.length
  const counts = { perfect: 0, good: 0, early: 0, late: 0, miss: 0 }
  for (const j of timing.judgments) {
    counts[j]++
  }
  const pct = (val: number) => (totalNotes > 0 ? (val / totalNotes) * 100 : 0)

  // 3. SVG 게이지 파라미터
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (overallScore / 100) * circumference

  // 4. 점수대별 고정 연습 팁
  const getPracticeTip = () => {
    if (overallScore >= 90) {
      return '완벽에 가까운 컨트롤입니다! 현재 템포가 편안해졌으니, 템포를 5~10 BPM 올리거나 리프 세분화(Subdivisions)를 높여 더 빠른 패싱을 시도해 보세요.'
    } else if (overallScore >= 70) {
      return '안정적인 기초가 잡혀 있습니다. 메커니즘을 흐트러뜨리는 피킹 습관이 없는지 거울을 보거나 동영상을 찍어 운지 폼을 확인하고, 타이밍이 빗나가는 특정 음(손가락 독립성 문제)을 집중해서 부분 반복해 보세요.'
    } else if (overallScore >= 50) {
      return '일부 음이 뭉개지거나 박자가 앞서가는(Early) 경향이 보입니다. 각 음이 균일한 길이와 세기로 나도록 새끼손가락(4번 손가락) 등의 힘을 가다듬고, 템포를 10 BPM 가량 내려서 완벽한 클린 톤으로 칠 수 있는 속도부터 다시 적응해 가세요.'
    } else {
      return '박자와 다이내믹 모두 편차가 심해 손가락 컨트롤이 엉키고 있을 가능성이 큽니다. 메트로놈을 아주 천천히(60 BPM 이하) 틀고, 한 음 한 음 정확한 크로매틱 운지(1-2-3-4) 프렛 누르기와 얼터네이트 피킹이 정비되는 데만 집중해 주세요.'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. 종합 점수 카드 */}
      <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center ${scoreBgClass}`}>
        <Award className="h-6 w-6 mb-2 text-zinc-400" />
        <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-4">종합 점수</span>
        
        {/* SVG 원형 진행바 */}
        <div className="relative h-32 w-32 flex items-center justify-center">
          <svg className="absolute -rotate-90 w-full h-full">
            {/* 배경 원 */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-zinc-800"
              strokeWidth="8"
              fill="transparent"
            />
            {/* 진행 원 */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className={`transition-all duration-500 ease-out ${scoreColorClass}`}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-4xl font-extrabold font-mono tabular-nums text-zinc-100">{overallScore}</span>
        </div>

        <p className="mt-4 text-xs font-semibold text-zinc-300">
          타이밍 {Math.round(pct(counts.perfect) + pct(counts.good) * 0.7)}%  |  다이내믹 {Math.max(0, Math.round(100 - dynamics.coefficientOfVariation * 200))}%
        </p>
      </div>

      {/* 2. 타이밍 & 다이내믹 디테일 */}
      <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Activity className="h-5 w-5 text-teal-400" />
          <h4 className="font-bold text-zinc-200">진단 세부 사항</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 타이밍 분석 */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              박자 정밀도 (Timing)
            </h5>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-lg p-2.5">
                <span className="text-zinc-500 block text-[10px]">평균 편차</span>
                <span className={`text-sm font-bold ${Math.abs(timing.meanDeviationMs) > 12 ? 'text-orange-400' : 'text-zinc-200'}`}>
                  {timing.meanDeviationMs > 0 ? `+${Math.round(timing.meanDeviationMs)}` : Math.round(timing.meanDeviationMs)} ms
                </span>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-lg p-2.5">
                <span className="text-zinc-500 block text-[10px]">표준편차 (지속성)</span>
                <span className={`text-sm font-bold ${timing.stdDeviationMs > 25 ? 'text-rose-400' : 'text-zinc-200'}`}>
                  ±{Math.round(timing.stdDeviationMs)} ms
                </span>
              </div>
            </div>

            {/* 판정 분포 비율 바 */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] text-zinc-500 block">판정 분포</span>
              <div className="h-3 w-full rounded-full bg-zinc-850 overflow-hidden flex">
                <div style={{ width: `${pct(counts.perfect)}%` }} className="h-full bg-lime-400 transition-all" title="Perfect" />
                <div style={{ width: `${pct(counts.good)}%` }} className="h-full bg-amber-400 transition-all" title="Good" />
                <div style={{ width: `${pct(counts.early) + pct(counts.late)}%` }} className="h-full bg-rose-400 transition-all" title="Early/Late" />
                <div style={{ width: `${pct(counts.miss)}%` }} className="h-full bg-zinc-650 transition-all" title="Miss" />
              </div>
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>Perfect: {counts.perfect}</span>
                <span>Good: {counts.good}</span>
                <span>Early/Late: {counts.early + counts.late}</span>
                <span>Miss: {counts.miss}</span>
              </div>
            </div>
          </div>

          {/* 다이내믹 분석 */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-zinc-500" />
              음량 일관성 (Dynamics)
            </h5>
            
            <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-lg p-2.5 font-mono flex items-center justify-between">
              <div>
                <span className="text-zinc-500 block text-[10px]">변동계수 (CV)</span>
                <span className="text-sm font-bold text-zinc-200">{dynamics.coefficientOfVariation.toFixed(2)}</span>
              </div>
              <span className={`text-[10px] rounded px-2 py-0.5 font-semibold ${
                dynamics.coefficientOfVariation <= 0.15 
                  ? 'bg-lime-500/10 text-lime-400 border border-lime-900/30' 
                  : dynamics.coefficientOfVariation <= 0.28
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-900/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-900/30'
              }`}>
                {dynamics.coefficientOfVariation <= 0.15 ? '매우 고름' : dynamics.coefficientOfVariation <= 0.28 ? '보통' : '불안정'}
              </span>
            </div>

            {/* 이상치 목록 */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] text-zinc-500 block">피킹 볼륨 밸런스</span>
              {dynamics.outliers.length > 0 ? (
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {dynamics.outliers.slice(0, 3).map((outlier, i) => (
                    <div key={i} className="flex justify-between items-center bg-zinc-950/30 px-2 py-1 rounded border border-zinc-850">
                      <span className="text-zinc-400">{outlier.index + 1}번째 피킹</span>
                      <span className={outlier.direction === 'loud' ? 'text-red-400' : 'text-blue-400'}>
                        {outlier.direction === 'loud' ? '너무 강함 (Loud)' : '너무 약함 (Quiet)'}
                      </span>
                    </div>
                  ))}
                  {dynamics.outliers.length > 3 && (
                    <div className="text-[10px] text-zinc-500 text-center">외 {dynamics.outliers.length - 3}개의 이상치가 더 있습니다.</div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 italic bg-zinc-950/20 p-2.5 rounded border border-zinc-850">
                  모든 피킹 강도가 기준치 범위 내에서 일정하게 유지되었습니다!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 요약 텍스트 & 피킹 분석 권장 조언 */}
      <div className="lg:col-span-3 rounded-2xl border border-zinc-850 bg-gradient-to-r from-zinc-900/60 to-zinc-950/60 p-6 space-y-4">
        <div>
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">피드백 요약</span>
          <p className="text-sm font-semibold text-zinc-150 leading-relaxed">{summary}</p>
        </div>
        
        <div className="border-t border-zinc-850/60 pt-3">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">추천 연습 팁</span>
          <p className="text-xs text-zinc-400 leading-relaxed">{getPracticeTip()}</p>
        </div>
      </div>
    </div>
  )
}
