"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth, updateProfile, logout } from "@/lib/auth-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  User,
  Mail,
  LogOut,
  Pencil,
  Check,
  X,
  Shield,
  Camera,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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

export function UserProfile() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isLoggedIn || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
          <User className="h-10 w-10 text-primary/50" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">尚未登录</h2>
        <p className="text-muted-foreground/60 mb-8 text-center max-w-md">
          登录后可以查看个人资料、发表评论、参与每日投票等更多互动功能。
        </p>
        <Link href="/login">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 h-11 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
            前往登录
          </Button>
        </Link>
      </div>
    )
  }

  const startEditing = () => {
    setEditName(user.name)
    setEditBio(user.bio || "")
    setIsEditing(true)
  }

  const saveProfile = () => {
    if (!editName.trim()) {
      toast.error("用户名不能为空")
      return
    }
    updateProfile({ name: editName, bio: editBio })
    setIsEditing(false)
    toast.success("个人资料已更新")
  }

  const handleLogout = () => {
    logout()
    toast.success("已退出登录")
    router.push("/")
  }

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('只支持 JPG、PNG、GIF、WebP 格式的图片')
      return
    }

    // 验证文件大小
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        // 更新本地状态
        updateProfile({ avatar: result.data.avatar })
        toast.success('头像上传成功')
      } else {
        toast.error(result.error || '上传失败')
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      toast.error('上传失败，请稍后重试')
    } finally {
      setIsUploading(false)
      // 清空 input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div>
      <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// profile"}</span>
      <h1 className="text-4xl font-bold text-foreground mb-14">个人中心</h1>

      {/* Profile Card */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-8 mb-8 card-glow">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-xl shadow-primary/5">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-mono font-bold">
                {getAvatarInitials(user.name, user.avatar)}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all duration-300"
              title="上传头像"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            {user.isAdmin && (
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary border-[3px] border-card">
                <Shield className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground/60 mb-1.5 block">用户名</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-background/30 border-border/40 focus:border-primary/40 h-10 rounded-lg max-w-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground/60 mb-1.5 block">个人简介</Label>
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="bg-background/30 border-border/40 focus:border-primary/40 rounded-lg resize-none min-h-[80px] max-w-lg"
                    placeholder="介绍一下自己..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProfile} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                    <Check className="h-3.5 w-3.5" /> 保存
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="border-border/40 gap-1.5">
                    <X className="h-3.5 w-3.5" /> 取消
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                  {user.isAdmin && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                      管理员
                    </span>
                  )}
                </div>
                <p className="text-foreground/60 leading-relaxed mb-5 max-w-lg">
                  {user.bio || "这个人很懒，还没有填写简介..."}
                </p>
                <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground/50">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {user.email}
                  </span>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button size="sm" variant="outline" onClick={startEditing} className="border-border/40 hover:border-primary/30 hover:bg-primary/5 gap-1.5 transition-all duration-300">
                    <Pencil className="h-3.5 w-3.5" /> 编辑资料
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLogout} className="border-border/40 hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive gap-1.5 transition-all duration-300">
                    <LogOut className="h-3.5 w-3.5" /> 退出登录
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
