"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { Terminal, Eye, EyeOff, Github, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { login, loginAsAdmin } from "@/lib/auth-store"

function AuthFormInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login"
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (activeTab === "login") {
      if (email === "admin@syslog.dev") {
        loginAsAdmin()
        toast.success("欢迎回来，管理员！")
      } else {
        login(email.split("@")[0] || "user", email)
        toast.success("登录成功！")
      }
    } else {
      if (!username.trim()) {
        toast.error("请输入用户名")
        setIsLoading(false)
        return
      }
      login(username, email)
      toast.success("注册成功！欢迎加入 SysLog")
    }
    setIsLoading(false)
    router.push("/")
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Terminal className="h-7 w-7 text-primary" />
            <div className="absolute inset-0 rounded-2xl animate-glow-pulse bg-primary/5" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {activeTab === "login" ? "欢迎回来" : "创建账号"}
        </h1>
        <p className="text-sm text-muted-foreground/60 mt-2">
          {activeTab === "login"
            ? "登录后可以评论文章、参与投票和互动"
            : "加入社区，开始技术交流与讨论"}
        </p>
      </div>

      <div className="flex rounded-xl border border-border/40 bg-card/30 p-1 mb-8">
        <button
          onClick={() => setActiveTab("login")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
            activeTab === "login"
              ? "bg-card text-foreground shadow-sm border border-border/30"
              : "text-muted-foreground/60 hover:text-foreground border border-transparent"
          }`}
        >
          登录
        </button>
        <button
          onClick={() => setActiveTab("register")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
            activeTab === "register"
              ? "bg-card text-foreground shadow-sm border border-border/30"
              : "text-muted-foreground/60 hover:text-foreground border border-transparent"
          }`}
        >
          注册
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {activeTab === "register" && (
          <div>
            <Label htmlFor="username" className="text-sm text-foreground/80 mb-2 block">
              用户名
            </Label>
            <Input
              id="username"
              placeholder="kernel_hacker"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-card/30 border-border/40 focus:border-primary/40 h-11 font-mono rounded-lg transition-all duration-300"
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="email" className="text-sm text-foreground/80 mb-2 block">
            邮箱
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-card/30 border-border/40 focus:border-primary/40 h-11 rounded-lg transition-all duration-300"
            required
          />
          {activeTab === "login" && (
            <p className="text-[10px] text-muted-foreground/30 mt-1.5 font-mono">
              {"提示：输入 admin@syslog.dev 可以管理员身份登录"}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="password" className="text-sm text-foreground/80">
              密码
            </Label>
            {activeTab === "login" && (
              <button type="button" className="text-xs text-primary/70 hover:text-primary transition-colors duration-300">
                忘记密码？
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="输入你的密码"
              className="bg-card/30 border-border/40 focus:border-primary/40 h-11 pr-10 rounded-lg transition-all duration-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors duration-300"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {activeTab === "register" && (
          <div>
            <Label htmlFor="confirm-password" className="text-sm text-foreground/80 mb-2 block">
              确认密码
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="再次输入密码"
              className="bg-card/30 border-border/40 focus:border-primary/40 h-11 rounded-lg transition-all duration-300"
              required
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 mt-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              {activeTab === "login" ? "登录中..." : "注册中..."}
            </span>
          ) : (
            activeTab === "login" ? "登 录" : "注 册"
          )}
        </Button>
      </form>

      <div className="relative my-8">
        <Separator className="bg-border/30" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs text-muted-foreground/40">
          或者使用
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-11 gap-2 border-border/40 hover:border-primary/30 hover:bg-primary/5 rounded-lg transition-all duration-300"
          onClick={() => { loginAsAdmin(); toast.success("通过 GitHub 登录成功"); router.push("/") }}
        >
          <Github className="h-4 w-4" />
          GitHub
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 border-border/40 hover:border-primary/30 hover:bg-primary/5 rounded-lg transition-all duration-300"
          onClick={() => { login("google_user", "user@gmail.com"); toast.success("通过 Google 登录成功"); router.push("/") }}
        >
          <Mail className="h-4 w-4" />
          Google
        </Button>
      </div>

      <div className="mt-10 rounded-xl border border-border/30 bg-card/20 p-4 font-mono text-xs text-muted-foreground/40">
        <span className="text-primary/60">$</span> ssh user@syslog.dev
        <br />
        <span className="text-foreground/40">
          {activeTab === "login"
            ? "正在验证身份... 请在上方输入凭据。"
            : "正在创建新用户... 请填写上方表单。"}
        </span>
      </div>
    </div>
  )
}

export function AuthForm() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-card/30 rounded-xl" />}>
      <AuthFormInner />
    </Suspense>
  )
}
