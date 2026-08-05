/**
 * 本地存储管理
 * - 账号信息加密存储
 * - 历史记录明文存储
 * - 主题设置明文存储
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { encryptData, decryptData } from './crypto'
import type { ZeppTokens } from './api'

// 兼容性 UUID 生成（crypto.randomUUID 在非 HTTPS 环境可能不可用）
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface Account {
  id: string
  name: string
  username: string
  password: string
  tokens?: ZeppTokens
  lastSuccessSteps?: number
  lastSuccessTime?: number
}

export interface HistoryRecord {
  id: string
  accountId: string
  accountName: string
  steps: number
  success: boolean
  message: string
  timestamp: number
}

interface StoreState {
  // 加密相关
  encrypted: boolean
  passphrase: string | null

  // 数据
  accounts: Account[]
  records: HistoryRecord[]
  currentAccountId: string | null

  // 设置
  theme: 'light' | 'dark'
  maxStepLimit: number

  // Actions
  initEncryption: (passphrase: string) => void
  setPassphrase: (passphrase: string) => void
  addAccount: (account: Omit<Account, 'id'>) => string
  updateAccount: (id: string, updates: Partial<Account>) => void
  removeAccount: (id: string) => void
  setCurrentAccount: (id: string | null) => void
  addRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void
  clearRecords: () => void
  toggleTheme: () => void
  setMaxStepLimit: (limit: number) => void
}

// 简单的内存密钥缓存（每次会话需要重新输入口令解密）
let decryptedAccounts: Account[] | null = null

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      encrypted: false,
      passphrase: null,
      accounts: [],
      records: [],
      currentAccountId: null,
      theme: 'light',
      maxStepLimit: 98800,

      initEncryption: (passphrase: string) => {
        set({ passphrase })
      },

      setPassphrase: (passphrase: string) => {
        decryptedAccounts = null
        set({ passphrase })
      },

      addAccount: (account) => {
        const id = genId()
        const newAccount: Account = { ...account, id }
        const accounts = [...get().accounts, newAccount]
        set({ accounts })
        if (!get().currentAccountId) {
          set({ currentAccountId: id })
        }
        return id
      },

      updateAccount: (id, updates) => {
        const accounts = get().accounts.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        )
        set({ accounts })
      },

      removeAccount: (id) => {
        const accounts = get().accounts.filter((a) => a.id !== id)
        const currentAccountId =
          get().currentAccountId === id
            ? accounts[0]?.id || null
            : get().currentAccountId
        set({ accounts, currentAccountId })
      },

      setCurrentAccount: (id) => set({ currentAccountId: id }),

      addRecord: (record) => {
        const newRecord: HistoryRecord = {
          ...record,
          id: genId(),
          timestamp: Date.now(),
        }
        const records = [newRecord, ...get().records].slice(0, 200)
        set({ records })
      },

      clearRecords: () => set({ records: [] }),

      toggleTheme: () => {
        const theme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme })
        applyTheme(theme)
      },

      setMaxStepLimit: (limit) => set({ maxStepLimit: limit }),
    }),
    {
      name: 'stepsync-store',
      partialize: (state) => ({
        accounts: state.accounts,
        records: state.records,
        currentAccountId: state.currentAccountId,
        theme: state.theme,
        maxStepLimit: state.maxStepLimit,
      }),
    }
  )
)

export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function initTheme() {
  const store = useStore.getState()
  const saved = store.theme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = saved || (prefersDark ? 'dark' : 'light')
  applyTheme(theme)
  if (!saved) {
    store.toggleTheme() // 切换到系统偏好
    if (theme === 'light') store.toggleTheme() // 再切回来
  }
}
