import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Footprints, Zap, RotateCcw, Loader2, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { ZeppClient } from '@/lib/api'
import { formatNumber, formatTime, maskAccount, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const QUICK_PRESETS = [500, 1000, 2000, 5000]
const WECHAT_MAX = 98800

export default function Dashboard() {
  const navigate = useNavigate()
  const accounts = useStore((s) => s.accounts)
  const currentAccountId = useStore((s) => s.currentAccountId)
  const setCurrentAccount = useStore((s) => s.setCurrentAccount)
  const updateAccount = useStore((s) => s.updateAccount)
  const addRecord = useStore((s) => s.addRecord)
  const records = useStore((s) => s.records)

  const currentAccount = accounts.find((a) => a.id === currentAccountId)

  // 动态步数上限：基于上次成功步数 + 9000
  const dynamicMax = useMemo(() => {
    const base = currentAccount?.lastSuccessSteps || 1
    return Math.min(WECHAT_MAX, base + 9000)
  }, [currentAccount?.lastSuccessSteps])

  const [steps, setSteps] = useState<number>(() => currentAccount?.lastSuccessSteps || 1000)
  const [submitting, setSubmitting] = useState(false)

  // 切换账号时重置步数
  const handleAccountSwitch = (id: string) => {
    setCurrentAccount(id)
    const acc = accounts.find((a) => a.id === id)
    setSteps(acc?.lastSuccessSteps || 1000)
  }

  const handleQuickAdd = (delta: number) => {
    setSteps((prev) => Math.min(dynamicMax, Math.max(1, prev + delta)))
  }

  const handleReset = () => {
    setSteps(currentAccount?.lastSuccessSteps || 1000)
  }

  const handleSubmit = async () => {
    if (!currentAccount) {
      toast.error('请先添加账号')
      navigate('/accounts')
      return
    }
    if (steps > dynamicMax) {
      toast.error(`步数超出限制，单次最多增加 9000 步`)
      return
    }

    setSubmitting(true)
    const client = new ZeppClient(
      currentAccount.username,
      currentAccount.password,
      currentAccount.tokens
    )
    const result = await client.submitSteps(steps)

    addRecord({
      accountId: currentAccount.id,
      accountName: currentAccount.name,
      steps,
      success: result.success,
      message: result.message,
    })

    if (result.success) {
      updateAccount(currentAccount.id, {
        tokens: client.getTokens(),
        lastSuccessSteps: steps,
        lastSuccessTime: Date.now(),
      })
      toast.success(`成功提交 ${formatNumber(steps)} 步`)
    } else {
      // 更新可能刷新的 token
      updateAccount(currentAccount.id, {
        tokens: client.getTokens(),
      })
      toast.error(result.message || '提交失败')
    }
    setSubmitting(false)
  }

  const progressPercent = (steps / dynamicMax) * 100
  const recentRecords = records.filter((r) => r.accountId === currentAccountId).slice(0, 5)

  // 无账号引导
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-purple-500/30">
            <Footprints className="h-9 w-9 text-white" />
          </div>
        </div>
        <h2 className="mb-2 text-xl font-bold">欢迎使用 StepSync</h2>
        <p className="mb-6 max-w-xs text-sm text-muted-foreground">
          添加你的 Zepp Life 账号即可开始管理步数，支持多账号与历史记录
        </p>
        <Button variant="gradient" size="lg" onClick={() => navigate('/accounts')}>
          <Plus className="h-4 w-4" />
          添加第一个账号
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 账号选择器 */}
      {accounts.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleAccountSwitch(acc.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all',
                  acc.id === currentAccountId
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-accent'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                  {acc.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-medium">{acc.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {maskAccount(acc.username)}
                  </div>
                </div>
              </button>
            ))}
            <button
              onClick={() => navigate('/accounts')}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              添加
            </button>
          </div>
        </Card>
      )}

      {/* 步数主面板 */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">目标步数</span>
            <Badge variant={steps >= dynamicMax * 0.9 ? 'success' : 'default'}>
              上限 {formatNumber(dynamicMax)}
            </Badge>
          </div>

          {/* 大数字展示 */}
          <div className="mb-4 text-center">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-5xl font-black tabular-nums text-transparent">
              {formatNumber(steps)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">步</div>
          </div>

          {/* 进度条 */}
          <Progress
            value={progressPercent}
            indicatorClassName="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            className="h-2.5"
          />

          {/* 滑块 */}
          <div className="mt-5">
            <Slider
              value={steps}
              min={1}
              max={dynamicMax}
              onValueChange={setSteps}
              className="h-2"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>1</span>
              <span>{formatNumber(dynamicMax)}</span>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-4 gap-2 p-4 pt-0">
          {QUICK_PRESETS.map((delta) => (
            <Button
              key={delta}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd(delta)}
              disabled={steps + delta > dynamicMax}
            >
              +{delta >= 1000 ? `${delta / 1000}k` : delta}
            </Button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 p-4 pt-0">
          <Button variant="outline" size="icon" onClick={handleReset} disabled={submitting}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="gradient"
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                提交步数
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 最近记录 */}
      {recentRecords.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">最近记录</h3>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              查看全部
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentRecords.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      r.success ? 'bg-emerald-500' : 'bg-red-500'
                    )}
                  />
                  <span className="text-sm tabular-nums">{formatNumber(r.steps)} 步</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(r.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 使用提示 */}
      <Card className="border-dashed bg-secondary/30 p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">使用提示</p>
            <ul className="space-y-1">
              <li>· 需要 Zepp Life 账号并已绑定微信运动</li>
              <li>· 单次步数增量建议不超过 9000，避免被检测</li>
              <li>· 微信步数上限为 98800</li>
              <li>· 提交后需等待几分钟同步至微信/支付宝</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
