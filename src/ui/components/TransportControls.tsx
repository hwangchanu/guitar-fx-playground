interface Props {
  playing: boolean
  onPlay: () => void
  onStop: () => void
}

export function TransportControls({ playing, onPlay, onStop }: Props) {
  const base = 'rounded px-3 py-1 text-sm font-medium disabled:opacity-40'
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onPlay}
        disabled={playing}
        className={`${base} bg-emerald-600 text-white`}
      >
        ▶ Play
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={!playing}
        className={`${base} bg-zinc-600 text-white`}
      >
        ■ Stop
      </button>
    </div>
  )
}
