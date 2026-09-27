import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { DataControls } from './DataControls'

export function Settings({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      queueMicrotask(() => document.getElementById('settings-trigger')?.focus())
    }
  }, [])

  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onKeyDown={(event) => {
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]')]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }} onCancel={(event) => {
    event.preventDefault()
    onClose()
  }}>
    <div className="settings-heading">
      <h2 id="settings-title">Settings</h2>
      <button className="icon-button" aria-label="Close Settings" onClick={onClose} autoFocus><X size={22} /></button>
    </div>
    <DataControls />
  </dialog>
}
