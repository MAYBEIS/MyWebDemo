"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { 
  Terminal, Eye, EyeOff, Github, Mail, AlertCircle, Shield, CheckCircle, 
  Loader2, Database, ArrowRight, RefreshCw, Server, Table
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { login, register, useAuth } from "@/lib/auth-store"

// 设置状态接口
interface SetupStatus {
  setupPhase: 'database' | 'migration' | 'admin' | 'complete'
  needsSetup: boolean
  dbConnected: boolean
  dbType: 'sqlite' | 'postgresql'
  tablesExist: {
    users: boolean
    posts: boolean
    comments: boolean
    system_settings: boolean
    allTablesExist: boolean
  }
  needsMigration: boolean
  hasAdmin: boolean
  hasUsers: boolean
  defaultEmail?: string
  defaultName?: string
  hasDefaultPassword: boolean
}

// 步骤指示器组件
function StepIndicator({ 
  currentPhase 
}: { 
  currentPhase: 'database' | 'migration' | 'admin' | 'complete' 
}) {
  const steps = [
    { key: 'database', label: '数据库连接', icon: Database },
    { key: 'migration', label: '表结构迁移', icon: Table },
    { key: 'admin', label: '管理员账号', icon: Shield },
  ]
  
  const currentIndex = steps.findIndex(s => s.key === currentPhase)
  
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === currentIndex
        const isCompleted = index < currentIndex
        const isPending = index > currentIndex
        
        return (
          <div key={step.key} className="flex items-center">
            <div 
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all
                ${isActive ? 'bg-primary text-primary-foreground' : ''}
                ${isCompleted ? 'bg-green-500/20 text-green-600 dark:text-green-400' : ''}
                ${isPending ? 'bg-muted text-muted-foreground' : ''}
              `}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className={`h-4 w-4 mx-2 ${
                index < currentIndex ? 'text-green-500' : 'text-muted-foreground/30'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// 数据库连接检查组件
function DatabaseCheckStep({ 
  status, 
  onRetry 
}: { 
  status: SetupStatus
  onRetry: () => void 
}) {
  return (
    <div className="w-full max-w-md animate-slide-up">
      <Card className="border-destructive/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
              <Database className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">数据库连接失败</CardTitle>
          <CardDescription>
            无法连接到数据库，请检查配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">连接错误</AlertTitle>
            <AlertDescription className="text-destructive/80 text-sm">
              请检查 <code className="px-1 py-0.5 bg-muted rounded">.env</code> 文件中的 
              <code className="px-1 py-0.5 bg-muted rounded">DATABASE_URL</code> 配置是否正确
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span>数据库类型: {status.dbType === 'sqlite' ? 'SQLite' : 'PostgreSQL'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>连接状态: <span className="text-destructive">失败</span></span>
            </div>
          </div>

          <Button
            onClick={onRetry}
            className="w-full h-11 mt-6"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重新检查连接
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// 数据库迁移组件
function MigrationStep({ 
  status, 
  onMigrate, 
  isMigrating, 
  migrateResult,
  onRetry 
}: { 
  status: SetupStatus
  onMigrate: () => void
  isMigrating: boolean
  migrateResult: { success: boolean; message: string; error?: string } | null
  onRetry: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div className="w-full max-w-md animate-slide-up">
      <Card className="border-amber-500/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Table className="h-7 w-7 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-xl">数据库迁移</CardTitle>
          <CardDescription>
            需要创建数据库表结构
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">需要迁移</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300 text-sm">
              检测到数据库表不存在，需要执行数据库迁移来创建表结构
            </AlertDescription>
          </Alert>

          {/* 表状态详情 */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border/40">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="text-sm font-medium">表状态详情</span>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                {showDetails ? '收起' : '展开'}
              </Button>
            </div>
            {showDetails && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {status.tablesExist.users ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span>users 表</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.tablesExist.posts ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span>posts 表</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.tablesExist.comments ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span>comments 表</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.tablesExist.system_settings ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span>system_settings 表</span>
                </div>
              </div>
            )}
          </div>

          {/* 迁移结果 */}
          {migrateResult && (
            <Alert 
              className={`mb-6 ${migrateResult.success 
                ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' 
                : 'border-destructive/50 bg-destructive/5'
              }`}
            >
              {migrateResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className={migrateResult.success ? 'text-green-700 dark:text-green-400' : 'text-destructive'}>
                {migrateResult.message}
                {migrateResult.error && (
                  <div className="mt-2 text-xs opacity-75">{migrateResult.error}</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1 h-11"
              disabled={isMigrating}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新状态
            </Button>
            <Button
              onClick={onMigrate}
              className="flex-1 h-11"
              disabled={isMigrating}
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  迁移中...
                </>
              ) : (
                <>
                  <Table className="h-4 w-4 mr-2" />
                  执行迁移
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 初始化向导组件
function SetupWizard({ 
  defaultEmail, 
  defaultName, 
  hasDefaultPassword,
  dbType,
  onComplete 
}: { 
  defaultEmail?: string
  defaultName?: string
  hasDefaultPassword: boolean
  dbType: 'sqlite' | 'postgresql'
  onComplete: () => void 
}) {
  const [email, setEmail] = useState(defaultEmail || "")
  const [name, setName] = useState(defaultName || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证
    if (!email.trim()) {
      setError("请输入邮箱地址")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址")
      return
    }

    if (!name.trim()) {
      setError("请输入管理员名称")
      return
    }

    if (name.length < 2) {
      setError("名称长度至少为 2 个字符")
      return
    }

    if (!password) {
      setError("请输入密码")
      return
    }

    if (password.length < 6) {
      setError("密码长度至少为 6 位")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("管理员账号创建成功！请登录")
        onComplete()
      } else {
        setError(data.error || "创建失败，请稍后重试")
      }
    } catch (err) {
      console.error("Setup failed:", err)
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Shield className="h-7 w-7 text-primary" />
              <div className="absolute inset-0 rounded-2xl animate-glow-pulse bg-primary/5" />
            </div>
          </div>
          <CardTitle className="text-xl">创建管理员账号</CardTitle>
          <CardDescription>
            创建第一个管理员账号来完成系统初始化
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
            <Shield className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-700 dark:text-blue-400">最后一步</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-300 text-sm">
              这是系统的第一个账号，将自动获得管理员权限
              <br />
              <span className="text-xs opacity-75">
                数据库类型: {dbType === 'sqlite' ? 'SQLite (开发模式)' : 'PostgreSQL (生产模式)'}
              </span>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="setup-name" className="text-sm text-foreground/80 mb-2 block">
                管理员名称
              </Label>
              <Input
                id="setup-name"
                placeholder="Admin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-card/30 border-border/40 focus:border-primary/40 h-11 rounded-lg"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="setup-email" className="text-sm text-foreground/80 mb-2 block">
                邮箱地址
              </Label>
              <Input
                id="setup-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card/30 border-border/40 focus:border-primary/40 h-11 rounded-lg"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="setup-password" className="text-sm text-foreground/80 mb-2 block">
                密码
              </Label>
              <div className="relative">
                <Input
                  id="setup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="至少 6 位密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-card/30 border-border/40 focus:border-primary/40 h-11 pr-10 rounded-lg"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="setup-confirm" className="text-sm text-foreground/80 mb-2 block">
                确认密码
              </Label>
              <Input
                id="setup-confirm"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-card/30 border-border/40 focus:border-primary/40 h-11 rounded-lg"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  创建管理员账号
                </span>
              )}
            </Button>
          </form>

          {hasDefaultPassword && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              提示：.env 中已配置默认密码，可使用默认密码或自定义
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AuthFormInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  
  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login"
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 设置状态
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [checkingSetup, setCheckingSetup] = useState(true)
  
  // 迁移状态
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState<{ success: boolean; message: string; error?: string } | null>(null)
  
  // 表单字段
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // 检查是否需要初始化
  const checkSetup = async () => {
    try {
      const response = await fetch("/api/setup/status")
      if (response.ok) {
        const data = await response.json()
        setSetupStatus(data)
        
        // 如果有默认值，预填充
        if (data.defaultEmail) setEmail(data.defaultEmail)
        if (data.defaultName) setUsername(data.defaultName)
      }
    } catch (err) {
      console.error("Failed to check setup status:", err)
    } finally {
      setCheckingSetup(false)
    }
  }
  
  useEffect(() => {
    checkSetup()
  }, [])

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.push("/")
    }
  }, [isLoggedIn, authLoading, router])

  // 清除错误当切换标签或输入时
  useEffect(() => {
    setError(null)
  }, [activeTab, email, password, username, confirmPassword])

  // 执行数据库迁移
  const handleMigrate = async () => {
    setIsMigrating(true)
    setMigrateResult(null)
    
    try {
      const response = await fetch("/api/setup/migrate", {
        method: "POST",
      })
      const data = await response.json()
      
      setMigrateResult({
        success: data.success,
        message: data.message || (data.success ? '迁移成功' : '迁移失败'),
        error: data.error || data.details,
      })
      
      if (data.success) {
        toast.success("数据库迁移成功！")
        // 刷新状态
        setTimeout(() => {
          checkSetup()
        }, 1000)
      }
    } catch (err) {
      console.error("Migration failed:", err)
      setMigrateResult({
        success: false,
        message: '迁移请求失败',
        error: err instanceof Error ? err.message : '网络错误',
      })
    } finally {
      setIsMigrating(false)
    }
  }

  // 表单验证
  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError("请输入邮箱地址")
      return false
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址")
      return false
    }

    if (!password) {
      setError("请输入密码")
      return false
    }

    if (password.length < 6) {
      setError("密码长度至少为 6 位")
      return false
    }

    if (activeTab === "register") {
      if (!username.trim()) {
        setError("请输入用户名")
        return false
      }

      if (username.length < 2) {
        setError("用户名长度至少为 2 个字符")
        return false
      }

      if (password !== confirmPassword) {
        setError("两次输入的密码不一致")
        return false
      }
    }

    return true
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      let result: { success: boolean; error?: string }

      if (activeTab === "login") {
        result = await login(email, password)
        if (result.success) {
          toast.success("登录成功！")
          router.push("/")
        } else {
          setError(result.error || "登录失败，请检查邮箱和密码")
        }
      } else {
        result = await register(email, password, username)
        if (result.success) {
          toast.success("注册成功！欢迎加入 SysLog")
          router.push("/")
        } else {
          setError(result.error || "注册失败，请稍后重试")
        }
      }
    } catch (err) {
      console.error("提交失败:", err)
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化完成后刷新状态
  const handleSetupComplete = async () => {
    await checkSetup()
  }

  // 加载中状态
  if (authLoading || checkingSetup) {
    return (
      <div className="w-full max-w-md flex items-center justify-center h-96">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  // 已登录状态不显示表单
  if (isLoggedIn) {
    return null
  }

  // 显示流程引导式初始化
  if (setupStatus && setupStatus.needsSetup) {
    const { setupPhase } = setupStatus
    
    return (
      <div className="w-full max-w-lg">
        <StepIndicator currentPhase={setupPhase} />
        
        {setupPhase === 'database' && (
          <DatabaseCheckStep 
            status={setupStatus}
            onRetry={checkSetup}
          />
        )}
        
        {setupPhase === 'migration' && (
          <MigrationStep 
            status={setupStatus}
            onMigrate={handleMigrate}
            isMigrating={isMigrating}
            migrateResult={migrateResult}
            onRetry={checkSetup}
          />
        )}
        
        {setupPhase === 'admin' && (
          <SetupWizard 
            defaultEmail={setupStatus.defaultEmail}
            defaultName={setupStatus.defaultName}
            hasDefaultPassword={setupStatus.hasDefaultPassword}
            dbType={setupStatus.dbType}
            onComplete={handleSetupComplete}
          />
        )}
      </div>
    )
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

      {/* 标签切换 */}
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

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 注册时显示用户名输入 */}
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
              disabled={isLoading}
            />
          </div>
        )}

        {/* 邮箱输入 */}
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
            disabled={isLoading}
          />
        </div>

        {/* 密码输入 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="password" className="text-sm text-foreground/80">
              密码
            </Label>
            {activeTab === "login" && (
              <button 
                type="button" 
                className="text-xs text-primary/70 hover:text-primary transition-colors duration-300"
                onClick={() => toast.info("密码找回功能开发中...")}
              >
                忘记密码？
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="输入你的密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card/30 border-border/40 focus:border-primary/40 h-11 pr-10 rounded-lg transition-all duration-300"
              disabled={isLoading}
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

        {/* 注册时显示确认密码 */}
        {activeTab === "register" && (
          <div>
            <Label htmlFor="confirm-password" className="text-sm text-foreground/80 mb-2 block">
              确认密码
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-card/30 border-border/40 focus:border-primary/40 h-11 rounded-lg transition-all duration-300"
              disabled={isLoading}
            />
          </div>
        )}

        {/* 提交按钮 */}
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

      {/* 第三方登录按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          type="button"
          className="h-11 gap-2 border-border/40 hover:border-primary/30 hover:bg-primary/5 rounded-lg transition-all duration-300"
          onClick={() => toast.info("GitHub 登录功能开发中...")}
          disabled={isLoading}
        >
          <Github className="h-4 w-4" />
          GitHub
        </Button>
        <Button
          variant="outline"
          type="button"
          className="h-11 gap-2 border-border/40 hover:border-primary/30 hover:bg-primary/5 rounded-lg transition-all duration-300"
          onClick={() => toast.info("Google 登录功能开发中...")}
          disabled={isLoading}
        >
          <Mail className="h-4 w-4" />
          Google
        </Button>
      </div>

      {/* 底部提示 */}
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
