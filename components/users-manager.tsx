"use client"

import { useState } from "react"
import { Search, Shield, ShieldOff, Trash2, RefreshCw, Mail, Eye, Ban, UserX, Clock, FileText, ShoppingBag, MessageSquare, BookOpen, Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  bio: string | null
  isAdmin: boolean
  isBanned: boolean
  bannedReason: string | null
  bannedAt: string | null
  createdAt: string
  _count: {
    posts: number
    comments: number
  }
}

// 用户详情类型
interface UserDetails extends User {
  updatedAt: string
  _count: {
    posts: number
    comments: number
    orders: number
    guestbooks: number
  }
  orders: Array<{
    id: string
    orderNo: string
    amount: number
    status: string
    createdAt: string
    products: {
      name: string
    }
  }>
  user_memberships: Array<{
    type: string
    startDate: string
    endDate: string
    active: boolean
  }>
}

interface UsersManagerProps {
  initialUsers: User[]
}

// 获取用户头像首字母
function getAvatarInitials(name: string, avatar: string | null): string {
  if (avatar) return avatar
  return name
    .split(/[_\s]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// 格式化日期时间
function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 订单状态映射
const orderStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待支付', variant: 'outline' },
  paid: { label: '已支付', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  cancelled: { label: '已取消', variant: 'destructive' },
  refunded: { label: '已退款', variant: 'secondary' }
}

export function UsersManager({ initialUsers }: UsersManagerProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // 用户详情相关状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // 封禁相关状态
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [banningUser, setBanningUser] = useState<User | null>(null)
  const [isBanning, setIsBanning] = useState(false)

  // 过滤用户
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 查看用户详情
  const handleViewDetail = async (user: User) => {
    setLoadingDetail(true)
    setDetailDialogOpen(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        credentials: "include",
      })
      const data = await response.json()
      if (data.success) {
        setSelectedUser(data.data)
      } else {
        toast.error(data.error || "获取用户详情失败")
        setDetailDialogOpen(false)
      }
    } catch (error) {
      console.error("获取用户详情失败:", error)
      toast.error("获取用户详情失败")
      setDetailDialogOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  // 打开封禁对话框
  const openBanDialog = (user: User) => {
    setBanningUser(user)
    setBanReason(user.bannedReason || "")
    setBanDialogOpen(true)
  }

  // 执行封禁/解封操作
  const handleBanToggle = async () => {
    if (!banningUser) return
    
    setIsBanning(true)
    try {
      const willBeBanned = !banningUser.isBanned
      
      const response = await fetch(`/api/admin/users/${banningUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isBanned: willBeBanned,
          bannedReason: willBeBanned ? banReason : null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "操作失败")
      }

      // 更新本地用户列表
      setUsers(users.map(u =>
        u.id === banningUser.id ? {
          ...u,
          isBanned: willBeBanned,
          bannedReason: willBeBanned ? banReason : null,
          bannedAt: willBeBanned ? new Date().toISOString() : null,
        } : u
      ))
      
      // 如果详情对话框打开，也更新详情
      if (selectedUser?.id === banningUser.id) {
        setSelectedUser({
          ...selectedUser,
          isBanned: willBeBanned,
          bannedReason: willBeBanned ? banReason : null,
          bannedAt: willBeBanned ? new Date().toISOString() : null,
        })
      }

      toast.success(willBeBanned ? "用户已被封禁" : "用户已解封")
      setBanDialogOpen(false)
    } catch (error) {
      console.error("封禁操作失败:", error)
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally {
      setIsBanning(false)
    }
  }

  // 切换管理员状态
  const toggleAdmin = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAdmin: !user.isAdmin }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "操作失败")
      }

      setUsers(users.map(u =>
        u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u
      ))
      toast.success(user.isAdmin ? "已取消管理员权限" : "已设为管理员")
    } catch (error) {
      console.error("切换管理员状态失败:", error)
      toast.error("操作失败")
    }
  }

  // 删除用户
  const handleDelete = async (user: User) => {
    if (user.isAdmin) {
      toast.error("无法删除管理员用户")
      return
    }
    
    if (!confirm(`确定要删除用户 "${user.name}" 吗？此操作不可撤销。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "删除失败")
      }

      toast.success("用户已删除")
      setUsers(users.filter(u => u.id !== user.id))
    } catch (error) {
      console.error("删除用户失败:", error)
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }

  // 刷新用户列表
  const refreshUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users", { credentials: "include" })
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error("刷新用户列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
          <p className="text-sm text-muted-foreground/60 mt-1">
            共 {users.length} 位用户，{users.filter(u => u.isAdmin).length} 位管理员，{users.filter(u => u.isBanned).length} 位被封禁
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshUsers}
          disabled={isLoading}
          className="gap-2 border-border/40"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="搜索用户名或邮箱..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card/30 border-border/40"
        />
      </div>

      {/* 用户列表 */}
      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-card/50">
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">用户</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">邮箱</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">角色</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">统计</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">注册时间</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground/60">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className={`border-b border-border/20 last:border-0 hover:bg-card/20 transition-colors ${user.isBanned ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/40">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-mono">
                        {getAvatarInitials(user.name, user.avatar)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground/60">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={user.isAdmin ? "default" : "secondary"}
                    className={user.isAdmin ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/20 text-muted-foreground"}
                  >
                    {user.isAdmin ? "管理员" : "用户"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {user.isBanned ? (
                    <Badge variant="destructive" className="gap-1">
                      <Ban className="h-3 w-3" />
                      已封禁
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      正常
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
                    <span>文章 {user._count.posts}</span>
                    <span>评论 {user._count.comments}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground/50">
                    {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* 查看详情 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(user)}
                      className="h-8 w-8 p-0"
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground/60" />
                    </Button>
                    {/* 封禁/解封 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openBanDialog(user)}
                      className="h-8 w-8 p-0"
                      title={user.isBanned ? "解封用户" : "封禁用户"}
                      disabled={user.isAdmin}
                    >
                      {user.isBanned ? (
                        <UserX className="h-4 w-4 text-green-500" />
                      ) : (
                        <Ban className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </Button>
                    {/* 管理员权限 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAdmin(user)}
                      className="h-8 w-8 p-0"
                      title={user.isAdmin ? "取消管理员" : "设为管理员"}
                    >
                      {user.isAdmin ? (
                        <ShieldOff className="h-4 w-4 text-primary" />
                      ) : (
                        <Shield className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </Button>
                    {/* 删除 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user)}
                      className="h-8 w-8 p-0 hover:text-destructive"
                      title="删除用户"
                      disabled={user.isAdmin}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground/60" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground/40">
                  {searchQuery ? "没有找到匹配的用户" : "暂无用户"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 用户详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              用户详情
            </DialogTitle>
            <DialogDescription>
              查看用户的完整信息和活动记录
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={selectedUser.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-mono">
                    {getAvatarInitials(selectedUser.name, selectedUser.avatar)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                    {selectedUser.isAdmin && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">管理员</Badge>
                    )}
                    {selectedUser.isBanned && (
                      <Badge variant="destructive">已封禁</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedUser.email}
                  </p>
                  {selectedUser.bio && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedUser.bio}</p>
                  )}
                </div>
              </div>

              {/* 封禁信息 */}
              {selectedUser.isBanned && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <Ban className="h-4 w-4" />
                    <span className="font-medium">封禁状态</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">封禁时间：</span>{formatDateTime(selectedUser.bannedAt)}</p>
                    {selectedUser.bannedReason && (
                      <p><span className="text-muted-foreground">封禁原因：</span>{selectedUser.bannedReason}</p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* 统计信息 */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  活动统计
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <BookOpen className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold">{selectedUser._count.posts}</div>
                    <div className="text-xs text-muted-foreground">文章</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold">{selectedUser._count.comments}</div>
                    <div className="text-xs text-muted-foreground">评论</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold">{selectedUser._count.orders}</div>
                    <div className="text-xs text-muted-foreground">订单</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold">{selectedUser._count.guestbooks}</div>
                    <div className="text-xs text-muted-foreground">留言</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 时间信息 */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  时间信息
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">注册时间：</span>
                    <span>{formatDateTime(selectedUser.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">最后更新：</span>
                    <span>{formatDateTime(selectedUser.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* 会员信息 */}
              {selectedUser.user_memberships && selectedUser.user_memberships.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3">会员信息</h4>
                    <div className="space-y-2">
                      {selectedUser.user_memberships.map((membership, index) => (
                        <div key={index} className="rounded-lg bg-muted/30 p-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium">{membership.type}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {new Date(membership.startDate).toLocaleDateString('zh-CN')} - {new Date(membership.endDate).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <Badge variant={membership.active ? 'default' : 'secondary'}>
                            {membership.active ? '有效' : '已过期'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 最近订单 */}
              {selectedUser.orders && selectedUser.orders.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      最近订单
                    </h4>
                    <div className="space-y-2">
                      {selectedUser.orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="rounded-lg bg-muted/30 p-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono text-sm">{order.orderNo}</div>
                            <div className="text-sm text-muted-foreground">{order.products.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">¥{order.amount.toFixed(2)}</div>
                            <Badge variant={orderStatusMap[order.status]?.variant || 'secondary'} className="text-xs">
                              {orderStatusMap[order.status]?.label || order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            {selectedUser && !selectedUser.isAdmin && (
              <Button
                variant={selectedUser.isBanned ? "default" : "destructive"}
                onClick={() => {
                  setDetailDialogOpen(false)
                  openBanDialog(selectedUser)
                }}
              >
                {selectedUser.isBanned ? "解封用户" : "封禁用户"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 封禁对话框 */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              {banningUser?.isBanned ? "解封用户" : "封禁用户"}
            </DialogTitle>
            <DialogDescription>
              {banningUser?.isBanned
                ? `确定要解封用户 "${banningUser?.name}" 吗？解封后用户将恢复正常使用。`
                : `确定要封禁用户 "${banningUser?.name}" 吗？封禁后用户将无法登录。`
              }
            </DialogDescription>
          </DialogHeader>

          {!banningUser?.isBanned && (
            <div className="py-4">
              <Label htmlFor="banReason" className="text-sm text-muted-foreground">
                封禁原因（可选）
              </Label>
              <Textarea
                id="banReason"
                placeholder="请输入封禁原因..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialogOpen(false)}
              disabled={isBanning}
            >
              取消
            </Button>
            <Button
              variant={banningUser?.isBanned ? "default" : "destructive"}
              onClick={handleBanToggle}
              disabled={isBanning}
            >
              {isBanning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {banningUser?.isBanned ? "确认解封" : "确认封禁"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
