import { useState } from 'react'
import {
  Moon, Sun, Github, Zap, Shield, Info, Copy, Check, ChevronRight,
  Bell, Smartphone
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function SettingsPage() {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const maxStepLimit = useStore((s) => s.maxStepLimit)
  const setMaxStepLimit = useStore((s) => s.setMaxStepLimit)
  const records = useStore((s) => s.records)
  const accounts = useStore((s) => s.accounts)

  const [showActions, setShowActions] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [copied, setCopied] = useState(false)

  const githubActionsYml = `name: 自动刷步数
on:
  schedule:
    - cron: '0 0 * * *'  # 每天 08:00 北京时间
  workflow_dispatch:

jobs:
  sync-steps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install requests
      - name: Run
        env:
          ZEPP_USER: \${{ secrets.ZEPP_USER }}
          ZEPP_PWD: \${{ secrets.ZEPP_PWD }}
          MIN_STEP: 18000
          MAX_STEP: 25000
        run: python main.py`

  const handleCopy = () => {
    navigator.clipboard.writeText(githubActionsYml)
    setCopied(true)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">设置</h1>
        <p className="text-xs text-muted-foreground">个性化和高级配置</p>
      </div>

      {/* 外观 */}
      <Card className="divide-y divide-border">
        <SettingRow
          icon={theme === 'dark' ? Moon : Sun}
          iconColor="text-indigo-500"
          title="深色模式"
          desc="切换明暗主题"
        >
          <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        </SettingRow>

        <SettingRow
          icon={Zap}
          iconColor="text-amber-500"
          title="步数上限"
          desc="微信步数硬限制"
        >
          <Input
            type="number"
            value={maxStepLimit}
            onChange={(e) => setMaxStepLimit(Number(e.target.value))}
            className="h-8 w-24 text-right text-sm"
          />
        </SettingRow>
      </Card>

      {/* 自动化 */}
      <Card className="divide-y divide-border">
        <SettingRow
          icon={Github}
          iconColor="text-purple-500"
          title="GitHub Actions 自动刷步"
          desc="定时自动提交，无需手动操作"
          onClick={() => setShowActions(true)}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </SettingRow>

        <SettingRow
          icon={Bell}
          iconColor="text-pink-500"
          title="推送通知"
          desc="提交结果通知（即将推出）"
        >
          <Badge variant="secondary">敬请期待</Badge>
        </SettingRow>
      </Card>

      {/* 数据 */}
      <Card className="divide-y divide-border">
        <SettingRow
          icon={Shield}
          iconColor="text-emerald-500"
          title="数据安全"
          desc="所有数据存储在本地浏览器"
        >
          <Badge variant="success">已加密</Badge>
        </SettingRow>

        <SettingRow
          icon={Info}
          iconColor="text-blue-500"
          title="关于 StepSync"
          desc="版本、开源信息"
          onClick={() => setShowAbout(true)}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </SettingRow>
      </Card>

      {/* 数据统计 */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">本地数据</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="text-2xl font-bold tabular-nums">{accounts.length}</div>
            <div className="text-xs text-muted-foreground">已保存账号</div>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="text-2xl font-bold tabular-nums">{records.length}</div>
            <div className="text-xs text-muted-foreground">历史记录</div>
          </div>
        </div>
      </Card>

      {/* GitHub Actions 弹窗 */}
      <Dialog open={showActions} onClose={() => setShowActions(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>GitHub Actions 自动刷步</DialogTitle>
          <DialogDescription>
            将以下配置添加到你的 GitHub 仓库 .github/workflows/steps.yml
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <p className="font-medium mb-1">使用步骤：</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Fork 此项目到你的 GitHub</li>
              <li>在 Settings → Secrets 添加 ZEPP_USER 和 ZEPP_PWD</li>
              <li>复制下方 YAML 到 .github/workflows/steps.yml</li>
              <li>修改 cron 时间为你需要的执行时间</li>
            </ol>
          </div>
          <div className="relative">
            <pre className="max-h-64 overflow-auto scrollbar-thin rounded-lg bg-secondary p-3 text-xs">
              <code>{githubActionsYml}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-2 top-2"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="gradient" onClick={() => setShowActions(false)}>
            完成
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 关于弹窗 */}
      <Dialog open={showAbout} onClose={() => setShowAbout(false)}>
        <DialogHeader>
          <DialogTitle>关于 StepSync</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/30">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">StepSync</div>
              <div className="text-xs text-muted-foreground">版本 1.0.0</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              一个现代化的步数同步网页应用，通过 Zepp Life API 提交步数并同步至微信、支付宝等平台。
            </p>
            <div className="space-y-1.5">
              <Feature text="精美 UI 与流畅交互体验" />
              <Feature text="多账号管理与本地加密" />
              <Feature text="动态步数上限防检测" />
              <Feature text="历史记录与数据可视化" />
              <Feature text="PWA 支持，可安装到桌面" />
              <Feature text="GitHub Actions 自动刷步" />
            </div>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">免责声明</p>
            本工具仅供学习研究使用，使用本工具产生的任何后果由使用者自行承担。请合理设置步数，避免频繁提交。
          </div>
        </div>
        <DialogFooter>
          <Button variant="gradient" onClick={() => setShowAbout(false)}>
            关闭
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  iconColor,
  title,
  desc,
  children,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  desc: string
  children?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 ${onClick ? 'cursor-pointer hover:bg-accent/50' : ''}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-emerald-500" />
      {text}
    </div>
  )
}
