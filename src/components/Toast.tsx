import { useEffect } from 'react'

type Props = {
  message: string
  visible: boolean
  onClose: () => void
}

export function Toast({ message, visible, onClose }: Props) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="rounded-lg bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 shadow-xl ring-1 ring-slate-800 max-w-sm mx-4 transform transition-all duration-300 ease-out">
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
      <style>{`
        @keyframes fadeInSlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  )
}
