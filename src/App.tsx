import { useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Footprints, History, Users, Settings, Moon, Sun, Github } from 'lucide-react'
import { Toaster } from 'sonner'
import { useStore, initTheme } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Dashboard from '@/pages/Dashboard'
import Accounts from '@/pages/Accounts'
import HistoryPage from '@/pages/History'
import SettingsPage from '@/pages/Settings'

const navItems = [
  { to: '/', label: '刷步', icon: Footprints },
  { to: '/accounts', label: '账号', icon: Users },
  { to: '/history', label: '记录', icon: History },
  { to: '/settings', label: '设置', icon: Settings },
]

export default function App() {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const location = useLocation()

  useEffect(() => {
    initTheme()
  }, [])

  return (
    <div className="min-h-screen gradient-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/20">
              <Footprints className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold">StepSync</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="切换主题"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div key={location.pathname} className="animate-fade-in">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
