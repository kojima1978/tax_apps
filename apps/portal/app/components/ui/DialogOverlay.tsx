import { useEffect, useRef, type ReactNode } from 'react'

interface DialogOverlayProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export default function DialogOverlay({ isOpen, onClose, children }: DialogOverlayProps) {
  const cancelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={cancelRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
