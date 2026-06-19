import { useState, useRef } from 'react'
import { UploadCloud } from 'lucide-react'

interface Props {
  disabled: boolean
  onFile: (file: File) => void
}

export function AudioUpload({ disabled, onFile }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (disabled) return
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      onFile(file)
    } else if (file) {
      alert('오디오 파일(WAV, MP3 등)만 업로드할 수 있습니다.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFile(file)
    }
  }

  const handleClick = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
        disabled
          ? 'border-zinc-850 bg-zinc-950/20 text-zinc-600 opacity-50 pointer-events-none'
          : isDragOver
            ? 'border-teal-400 bg-teal-500/5 text-teal-300 cursor-pointer shadow-[0_0_15px_rgba(45,212,191,0.05)]'
            : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      
      <UploadCloud className={`mb-3 h-10 w-10 transition-transform ${isDragOver ? 'scale-110 text-teal-400' : 'text-zinc-500'}`} />
      
      <p className="text-xs font-semibold mb-1 text-zinc-350">
        {disabled ? '분석 중이거나 연습 진행 중에는 업로드할 수 없습니다' : '녹음 파일 드래그 & 드롭'}
      </p>
      
      {!disabled && (
        <p className="text-[10px] text-zinc-500">
          또는 영역을 클릭하여 WAV / MP3 파일 선택
        </p>
      )}
    </div>
  )
}
