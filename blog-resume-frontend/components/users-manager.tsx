"use client"

import { useState } from "react"
import { Search, Shield, ShieldOff, Trash2, RefreshCw, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  bio: string | null
  isAdmin: boolean
  createdAt: string
  _count: {
    posts: number
    comments: number
  }
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

export function UsersManager({ initialUsers }: UsersManagerProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // 过滤用户
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            共 {users.length} 位用户，{users.filter(u => u.isAdmin).length} 位管理员
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
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">统计</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">注册时间</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground/60">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border/20 last:border-0 hover:bg-card/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/40">
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
                  <div className="flex items-center justify-end gap-2">
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground/40">
                  {searchQuery ? "没有找到匹配的用户" : "暂无用户"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
