/// <reference types="vite/client" />
const base = (import.meta.env.VITE_API_BASE as string) || localStorage.getItem('API_BASE') || 'http://localhost:3000'

export async function post<T=any>(path: string, body: any) : Promise<{ ok: boolean, data: T }> {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export async function get<T=any>(path: string, token?: string) : Promise<{ ok: boolean, data: T }> {
  const res = await fetch(base + path, {
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}
