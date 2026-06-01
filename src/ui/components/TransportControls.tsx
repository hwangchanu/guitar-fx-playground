import { Play, Square } from 'lucide-react'

interface Props {
  playing: boolean
  onPlay: () => void
  onStop: () => void
}

export function TransportControls({ playing, onPlay, onStop }: Props) {
  return (
    <button
      type="button"
      onClick={playing ? onStop : onPlay}
      className={`inline-flex h-10 items-center gap-2 rounded-md px-6 font-medium text-white transition-colors ${
        playing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-zinc-800 hover:bg-zinc-700'
      }`}
    >
      {playing ? (
        <>
          <Square className="h-5 w-5" /> Stop
        </>
      ) : (
        <>
          <Play className="h-5 w-5" /> Play
        </>
      )}
    </button>
  )
}
