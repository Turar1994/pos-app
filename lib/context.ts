'use client'
import { createContext, useContext } from 'react'
import { Lang } from '@/lib/lang'

type Store = { id: string; name: string }
export type AppCtx = {
  store: Store
  lang: Lang
  setLang: (l: Lang) => void
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  refresh: number
  triggerRefresh: () => void
}

export const AppContext = createContext<AppCtx | null>(null)
export const useApp = () => useContext(AppContext)!
