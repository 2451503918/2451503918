import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Edit2, Check, X, UserPlus, KeyRound } from 'lucide-react'
import { useStore, type Account } from '@/lib/store'
import { maskAccount, formatTime, formatNumber, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export default function Accounts() {
  const accounts = useStore((s) => s.accounts)
  const addAccount = useStore((s) => s.addAccount)
  const updateAccount = useStore((s) => s.updateAccount)
  const removeAccount = useStore((s) => s.removeAccount)
  const currentAccountId = useStore((s) => s.currentAccountId)
  const setCurrentAccount = useStore((s) => s.setCurrentAccount)

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [form, setForm] = useState({ name: '', username: '', password: '' })

  const handleAdd = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error('请填写完整信息')
      return
    }
    addAccount({
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
    })
    toast.success('账号已添加')
    setForm({ name: '', username: '', password: '' })
    setShowAdd(false)
  }

  const handleRemove = (id: string) => {
    if (confirm('确定删除该账号？历史记录将保留。')) {
      removeAccount(id)
      toast.success('账号已删除')
    }
  }

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return
    updateAccount(id, { name: editName.trim() })
    setEditingId(null)
    toast.success('已更新')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">账号管理</h1>
          <p className="text-xs text-muted-foreground">共 {accounts.length} 个账号</p>
        </div>
        <Button variant="gradient" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          添加
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-medium">还没有账号</p>
          <p className="mb-4 text-xs text-muted-foreground">添加 Zepp Life 账号开始使用</p>
          <Button variant="gradient" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            添加账号
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              isCurrent={acc.id === currentAccountId}
              isEditing={editingId === acc.id}
              editName={editName}
              onSelect={() => setCurrentAccount(acc.id)}
              onEdit={() => {
                setEditingId(acc.id)
                setEditName(acc.name)
              }}
              onEditNameChange={setEditName}
              onSaveEdit={() => handleSaveEdit(acc.id)}
              onCancelEdit={() => setEditingId(null)}
              onRemove={() => handleRemove(acc.id)}
            />
          ))}
        </div>
      )}

      {/* 安全提示 */}
      <Card className="border-dashed bg-secondary/30 p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <KeyRound className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">数据安全</p>
            <p>账号密码仅存储在浏览器本地，不会上传到任何服务器。清除浏览器数据将导致账号丢失。</p>
          </div>
        </div>
      </Card>

      {/* 添加账号弹窗 */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)}>
        <DialogHeader>
          <DialogTitle>添加 Zepp Life 账号</DialogTitle>
          <DialogDescription>
            使用 Zepp Life（原小米运动）的独立账号登录，非小米账号
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">备注名称</Label>
            <Input
              id="name"
              placeholder="如：我的账号"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">账号</Label>
            <Input
              id="username"
              placeholder="手机号或邮箱"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="Zepp Life 登录密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>
            取消
          </Button>
          <Button variant="gradient" onClick={handleAdd}>
            添加
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function AccountCard({
  account,
  isCurrent,
  isEditing,
  editName,
  onSelect,
  onEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onRemove,
}: {
  account: Account
  isCurrent: boolean
  isEditing: boolean
  editName: string
  onSelect: () => void
  onEdit: () => void
  onEditNameChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
}) {
  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isCurrent && 'border-primary ring-1 ring-primary/20'
      )}
    >
      <div className="flex items-center gap-3">
        <button onClick={onSelect} className="flex flex-1 items-center gap-3 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-lg font-bold text-white">
            {account.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{account.name}</span>
                  {isCurrent && <Badge variant="success">当前</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {maskAccount(account.username)}
                </div>
                {account.lastSuccessSteps && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    上次 {formatNumber(account.lastSuccessSteps)} 步 ·{' '}
                    {account.lastSuccessTime ? formatTime(account.lastSuccessTime) : '-'}
                  </div>
                )}
              </>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" onClick={onSaveEdit} className="h-8 w-8">
                <Check className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onCancelEdit} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onRemove} className="h-8 w-8">
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
