"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  FileText,
  Users,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// 统计数据类型定义
interface DashboardStats {
  overview: {
    postsCount: number
    usersCount: number
    commentsCount: number
    ordersCount: number
    productsCount: number
    totalRevenue: number
    pendingOrders: number
    publishedPosts: number
  }
  today: {
    newUsers: number
    newComments: number
    newOrders: number
    revenue: number
  }
  recent: {
    posts: Array<{
      id: string
      title: string
      slug: string
      createdAt: string
      viewCount: number
      published: boolean
      author: string
    }>
    comments: Array<{
      id: string
      content: string
      createdAt: string
      author: { id: string; name: string; avatar: string | null } | null
      post: { id: string; title: string; slug: string } | null
    }>
    users: Array<{
      id: string
      name: string
      email: string
      avatar: string | null
      createdAt: string
      isAdmin: boolean
    }>
    orders: Array<{
      id: string
      orderNo: string
      amount: number
      status: string
      createdAt: string
      paymentMethod: string | null
      user: { id: string; name: string; email: string } | null
      product: { id: string; name: string } | null
    }>
  }
  popularPosts: Array<{
    id: string
    title: string
    slug: string
    viewCount: number
    likeCount: number
    commentCount: number
  }>
  chartData: Array<{
    date: string
    displayDate: string
    posts: number
    users: number
    comments: number
    orders: number
    revenue: number
  }>
  categoryStats: Array<{
    category: string
    count: number
  }>
  orderStatusStats: Array<{
    status: string
    count: number
  }>
}

interface DashboardContentProps {
  initialData: DashboardStats | null
}

// 图表颜色配置
const chartConfig = {
  posts: {
    label: "文章",
    color: "hsl(var(--chart-1))",
  },
  users: {
    label: "用户",
    color: "hsl(var(--chart-2))",
  },
  comments: {
    label: "评论",
    color: "hsl(var(--chart-3))",
  },
  orders: {
    label: "订单",
    color: "hsl(var(--chart-4))",
  },
  revenue: {
    label: "收入",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

// 饼图颜色
const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

// 订单状态映射
const ORDER_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "待支付", color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
  paid: { label: "已支付", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: "已完成", color: "bg-blue-500", icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: "已取消", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
  refunded: { label: "已退款", color: "bg-gray-500", icon: <AlertCircle className="h-3 w-3" /> },
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  const [stats, setStats] = useState<DashboardStats | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [activeChart, setActiveChart] = useState<"posts" | "users" | "comments" | "orders" | "revenue">("posts")

  // 获取数据
  useEffect(() => {
    if (!initialData) {
      fetchStats()
    }
  }, [initialData])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/dashboard/stats")
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("获取统计数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount || 0)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 相对时间
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return formatDate(dateString)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">无法加载统计数据</p>
        <Button onClick={fetchStats} variant="outline" className="ml-4">
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 概览统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="文章总数"
          value={stats.overview.postsCount}
          description={`已发布 ${stats.overview.publishedPosts} 篇`}
          icon={<FileText className="h-4 w-4" />}
          trend={stats.today.newUsers > 0 ? `今日+${stats.today.newUsers}` : undefined}
          trendUp={true}
        />
        <StatsCard
          title="用户总数"
          value={stats.overview.usersCount}
          description={`今日新增 ${stats.today.newUsers}`}
          icon={<Users className="h-4 w-4" />}
          trend={stats.today.newUsers > 0 ? `+${stats.today.newUsers}` : undefined}
          trendUp={true}
        />
        <StatsCard
          title="评论总数"
          value={stats.overview.commentsCount}
          description={`今日新增 ${stats.today.newComments}`}
          icon={<MessageSquare className="h-4 w-4" />}
          trend={stats.today.newComments > 0 ? `+${stats.today.newComments}` : undefined}
          trendUp={true}
        />
        <StatsCard
          title="订单总数"
          value={stats.overview.ordersCount}
          description={`待处理 ${stats.overview.pendingOrders}`}
          icon={<ShoppingCart className="h-4 w-4" />}
          trend={stats.today.newOrders > 0 ? `今日+${stats.today.newOrders}` : undefined}
          trendUp={true}
        />
      </div>

      {/* 收入和产品统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="总收入"
          value={formatCurrency(stats.overview.totalRevenue)}
          description={`今日 ${formatCurrency(stats.today.revenue)}`}
          icon={<DollarSign className="h-4 w-4" />}
          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10"
        />
        <StatsCard
          title="产品数量"
          value={stats.overview.productsCount}
          description="在售产品"
          icon={<Package className="h-4 w-4" />}
        />
        <StatsCard
          title="今日收入"
          value={formatCurrency(stats.today.revenue)}
          description="较昨日"
          icon={<TrendingUp className="h-4 w-4" />}
          className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10"
        />
        <StatsCard
          title="今日订单"
          value={stats.today.newOrders}
          description="新增订单"
          icon={<Activity className="h-4 w-4" />}
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 趋势图表 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">数据趋势</CardTitle>
                <CardDescription>最近7天数据变化</CardDescription>
              </div>
              <div className="flex gap-1">
                {(["posts", "users", "comments", "orders"] as const).map((key) => (
                  <Button
                    key={key}
                    variant={activeChart === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveChart(key)}
                    className="h-7 px-2 text-xs"
                  >
                    {chartConfig[key].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${activeChart})`} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={`var(--color-${activeChart})`} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey={activeChart}
                  stroke={`var(--color-${activeChart})`}
                  fillOpacity={1}
                  fill="url(#colorGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 收入图表 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">收入趋势</CardTitle>
            <CardDescription>最近7天收入变化</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 分类统计和订单状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 文章分类统计 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">文章分类分布</CardTitle>
            <CardDescription>按分类统计文章数量</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.categoryStats.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[150px] h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryStats}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                      >
                        {stats.categoryStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {stats.categoryStats.slice(0, 5).map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-sm">{item.category}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">暂无分类数据</div>
            )}
          </CardContent>
        </Card>

        {/* 订单状态分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">订单状态分布</CardTitle>
            <CardDescription>各状态订单数量</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.orderStatusStats.length > 0 ? (
              <div className="space-y-3">
                {stats.orderStatusStats.map((item) => {
                  const statusInfo = ORDER_STATUS_MAP[item.status] || {
                    label: item.status,
                    color: "bg-gray-500",
                    icon: null,
                  }
                  const percentage = (item.count / stats.overview.ordersCount) * 100
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                          <span className="text-sm">{statusInfo.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.count}</span>
                          <span className="text-xs text-muted-foreground">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${statusInfo.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">暂无订单数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近活动和热门文章 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近文章 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">最近文章</CardTitle>
              <Link href="/admin/posts">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent.posts.map((post) => (
                <div key={post.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{post.author}</span>
                      <Badge variant={post.published ? "default" : "secondary"} className="text-xs">
                        {post.published ? "已发布" : "草稿"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {post.viewCount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近评论 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">最近评论</CardTitle>
              <Link href="/admin/comments">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent.comments.map((comment) => (
                <div key={comment.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.author?.avatar || ""} />
                      <AvatarFallback className="text-xs">
                        {comment.author?.name?.charAt(0) || "匿"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {comment.author?.name || "匿名用户"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                    {comment.content}
                  </p>
                  {comment.post && (
                    <Link
                      href={`/blog/${comment.post.slug}`}
                      className="text-xs text-primary hover:underline pl-8 block"
                    >
                      回复: {comment.post.title}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 热门文章 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">热门文章</CardTitle>
            <CardDescription>按浏览量排序</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.popularPosts.map((post, index) => (
                <div key={post.id} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近用户和订单 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近用户 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">最近用户</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar || ""} />
                      <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{u.name}</span>
                        {u.isAdmin && (
                          <Badge variant="default" className="text-xs">
                            管理员
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getRelativeTime(u.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近订单 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">最近订单</CardTitle>
              <Link href="/orders">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent.orders.map((order) => {
                const statusInfo = ORDER_STATUS_MAP[order.status] || {
                  label: order.status,
                  color: "bg-gray-500",
                }
                return (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{order.orderNo}</span>
                          <Badge variant="secondary" className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{order.user?.name || "未知用户"}</span>
                          <span>·</span>
                          <span>{order.product?.name || "未知产品"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(order.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {getRelativeTime(order.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 统计卡片组件
interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  className?: string
}

function StatsCard({ title, value, description, icon, trend, trendUp, className }: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
            <span className="text-sm text-muted-foreground">{title}</span>
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs ${
                trendUp ? "text-green-500" : "text-red-500"
              }`}
            >
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// 加载骨架屏
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
