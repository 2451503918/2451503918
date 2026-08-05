import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'
import { History as HistoryIcon, Trash2, TrendingUp, BarChart3, Calendar } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatNumber, formatTime, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function HistoryPage() {
  const navigate = useNavigate()
  const records = useStore((s) => s.records)
  const clearRecords = useStore((s) => s.clearRecords)
  const [view, setView] = useState<'list' | 'chart'>('chart')

  const successRecords = useMemo(
    () => records.filter((r) => r.success),
    [records]
  )

  const chartData = useMemo(() => {
    return [...successRecords]
      .reverse()
      .slice(-15)
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        steps: r.steps,
        success: r.success,
      }))
  }, [successRecords])

  const stats = useMemo(() => {
    const total = records.length
    const success = successRecords.length
    const totalSteps = successRecords.reduce((sum, r) => sum + r.steps, 0)
    const avgSteps = success > 0 ? Math.round(totalSteps / success) : 0
    const maxSteps = successRecords.reduce((max, r) => Math.max(max, r.steps), 0)
    return { total, success, avgSteps, maxSteps }
  }, [records, successRecords])

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <HistoryIcon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mb-1 text-lg font-semibold">暂无记录</h2>
        <p className="mb-4 text-sm text-muted-foreground">提交步数后将在此显示历史</p>
        <Button variant="gradient" onClick={() => navigate('/')}>
          去刷步
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">历史记录</h1>
          <p className="text-xs text-muted-foreground">{records.length} 条记录</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('确定清空所有历史记录？')) {
              clearRecords()
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          清空
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="成功次数" value={formatNumber(stats.success)} sub={`/ ${stats.total}`} />
        <StatCard label="平均步数" value={formatNumber(stats.avgSteps)} />
        <StatCard label="最高步数" value={formatNumber(stats.maxSteps)} />
      </div>

      {/* 视图切换 */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'chart')}>
        <TabsList className="w-full">
          <TabsTrigger value="chart" className="flex-1">
            <TrendingUp className="mr-1 h-3.5 w-3.5" />
            图表
          </TabsTrigger>
          <TabsTrigger value="list" className="flex-1">
            <BarChart3 className="mr-1 h-3.5 w-3.5" />
            列表
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'chart' ? (
        <div className="space-y-4">
          {/* 折线图 */}
          {chartData.length > 1 && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">步数趋势</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    stroke="url(#lineGradient)"
                    strokeWidth={2.5}
                    dot={{ fill: '#a855f7', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* 柱状图 */}
          {chartData.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">步数分布</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${250 + i * 10}, 70%, 60%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      ) : (
        <Card className="divide-y divide-border">
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  r.success ? 'bg-emerald-500/10' : 'bg-red-500/10'
                )}
              >
                <span className="text-xs font-bold tabular-nums">
                  {r.success ? '✓' : '✕'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatNumber(r.steps)} 步
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.accountName}
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.message}
                </div>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatTime(r.timestamp)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">
        {value}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </Card>
  )
}
