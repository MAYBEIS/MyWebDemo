"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, updateProfile, logout } from "@/lib/auth-store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Calendar,
  MessageSquare,
  Heart,
  FileText,
  LogOut,
  Pencil,
  Check,
  X,
  Shield,
  Activity,
  Award,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export function UserProfile() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")

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
    setEditUsername(user.username)
    setEditBio(user.bio)
    setIsEditing(true)
  }

  const saveProfile = () => {
    if (!editUsername.trim()) {
      toast.error("用户名不能为空")
      return
    }
    updateProfile({ username: editUsername, bio: editBio })
    setIsEditing(false)
    toast.success("个人资料已更新")
  }

  const handleLogout = () => {
    logout()
    toast.success("已退出登录")
    router.push("/")
  }

  const statCards = [
    { icon: FileText, label: "发表文章", value: user.stats.posts, color: "text-primary" },
    { icon: MessageSquare, label: "评论数", value: user.stats.comments, color: "text-chart-2" },
    { icon: Heart, label: "获赞数", value: user.stats.likes, color: "text-destructive" },
  ]

  const achievements = [
    { icon: Award, label: "初来乍到", desc: "完成账户注册", unlocked: true },
    { icon: MessageSquare, label: "话题达人", desc: "累计评论 10 次", unlocked: user.stats.comments >= 10 },
    { icon: Heart, label: "人气之星", desc: "累计获赞 50 次", unlocked: user.stats.likes >= 50 },
    { icon: Activity, label: "活跃贡献", desc: "连续登录 7 天", unlocked: false },
  ]

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
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-mono font-bold">
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            {user.role === "admin" && (
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
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
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
                  <h2 className="text-2xl font-bold text-foreground">{user.username}</h2>
                  {user.role === "admin" && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                      管理员
                    </span>
                  )}
                </div>
                <p className="text-foreground/60 leading-relaxed mb-5 max-w-lg">{user.bio}</p>
                <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground/50">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {user.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> 加入于 {user.joinDate}
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card/30 p-6 transition-all duration-300 hover:bg-card/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 border border-primary/12">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <span className="text-sm text-muted-foreground/60">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-8">
        <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> 成就徽章
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {achievements.map((ach) => (
            <div
              key={ach.label}
              className={`flex items-center gap-4 rounded-lg border p-4 transition-all duration-300 ${
                ach.unlocked
                  ? "border-primary/20 bg-primary/[0.03]"
                  : "border-border/30 bg-card/10 opacity-50"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                ach.unlocked
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-secondary/30 border-border/30 text-muted-foreground/30"
              }`}>
                <ach.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${ach.unlocked ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {ach.label}
                </p>
                <p className="text-xs text-muted-foreground/40">{ach.desc}</p>
              </div>
              {ach.unlocked && (
                <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
