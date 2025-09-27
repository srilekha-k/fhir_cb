import React from 'react'

type ToastItem = { id: number; msg: string; type?: 'success'|'error'|'info' }
let pushFn: ((t: Omit<ToastItem, 'id'>) => void) | null = null

export function toast(msg: string, type?: ToastItem['type']) {
  pushFn?.({ msg, type })
}

export function ToastHost() {
  const [items, setItems] = React.useState<ToastItem[]>([])

  React.useEffect(() => {
    pushFn = (t) => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, ...t }])
      setTimeout(() => setItems((prev) => prev.filter(x => x.id !== id)), 3000)
    }
    return () => { pushFn = null }
  }, [])

  return (
    <div className="toast-host">
      {items.map(t => (
        <div key={t.id} className={'toast ' + (t.type || '')}>{t.msg}</div>
      ))}
    </div>
  )
}
