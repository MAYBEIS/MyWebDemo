"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Flame,
  TrendingUp,
  Clock,
  ThumbsUp,
  MessageSquare,
  Zap,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Calendar,
  Users,
  Sparkles,
  Loader2,
  Send,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-store"

// 分类选项
const CATEGORIES = [
  { value: "语言之争", label: "语言之争" },
  { value: "技术选型", label: "技术选型" },
  { value: "前沿技术", label: "前沿技术" },
  { value: "硬件架构", label: "硬件架构" },
  { value: "新方向", label: "新方向" },
]

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

interface TopicComment {
  id: string
  author: string
  avatar?: string
  content: string
  time: string
}

interface Topic {
  id: string
  title: string
  description: string
  category: string
  voteType: 'binary' | 'multiple'  // binary: 赞同/否定, multiple: 多选一
  options?: { id: string; text: string; count: number }[]  // 投票选项
  upvotes: number
  downvotes: number
  heat: number
  comments: TopicComment[]
  commentCount: number
  tags: string[]
  proposedBy: string
  timeLeft: string
  userVote: 'up' | 'down' | null
}

const today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })

const categoryColors: Record<string, string> = {
  "语言之争": "bg-chart-1/10 text-chart-1 border-chart-1/20",
  "技术选型": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "前沿技术": "bg-primary/10 text-primary border-primary/20",
  "硬件架构": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "新方向": "bg-chart-3/10 text-chart-3 border-chart-3/20",
}

function HeatBar({ heat }: { heat: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-secondary/40 overflow-hidden max-w-[80px]">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${heat}%`,
            background: heat > 80
              ? "oklch(0.65 0.2 25)"
              : heat > 50
              ? "oklch(0.75 0.16 172)"
              : "oklch(0.58 0.01 250)",
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground/40">{heat}</span>
    </div>
  )
}

// 骨架屏组件
function TopicSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-6">
      <div className="flex gap-4">
        {/* 内容骨架 - 无投票按钮 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrendingTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  // 使用Map记录每个话题的投票状态：undefined=未投票, 'up'=赞同, 'down'=反对
  const [voteState, setVoteState] = useState<Map<string, 'up' | 'down'>>(new Map())
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [sortBy, setSortBy] = useState<"votes" | "heat" | "comments">("votes")
  const { user, isLoggedIn } = useAuth()
  
  // 提议话题对话框状态
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [proposeForm, setProposeForm] = useState({
    title: "",
    description: "",
    category: "技术选型",
    tags: "",
    voteType: "binary" as "binary" | "multiple",
    options: "",
  })

  // 从API获取话题数据
  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/trending?sortBy=${sortBy}`)
        const data = await response.json()
        if (data.success && data.data) {
          setTopics(data.data)
          // 设置用户的投票状态
          const newVoteState = new Map<string, 'up' | 'down'>()
          data.data.forEach((topic: Topic) => {
            if (topic.userVote) {
              newVoteState.set(topic.id, topic.userVote)
            }
          })
          setVoteState(newVoteState)
        }
      } catch (error) {
        console.error('获取热榜话题失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTopics()
  }, [sortBy])

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      // 按赞同数排序
      if (sortBy === "votes") return b.upvotes - a.upvotes
      if (sortBy === "heat") return b.heat - a.heat
      return (b.commentCount || b.comments.length) - (a.commentCount || a.comments.length)
    })
  }, [topics, sortBy])

  const handleVote = async (id: string, direction: "up" | "down") => {
    if (!isLoggedIn) {
      toast.error("请先登录后再投票")
      return
    }
    
    // 先乐观更新UI
    const currentVote = voteState.get(id)
    let voteChange = 0
    let heatChange = 0
    
    if (currentVote === direction) {
      // 取消投票
      const newVoteState = new Map(voteState)
      newVoteState.delete(id)
      setVoteState(newVoteState)
      voteChange = direction === "up" ? -1 : 1
      heatChange = -2
    } else if (currentVote) {
      // 切换投票方向
      setVoteState(new Map(voteState).set(id, direction))
      voteChange = direction === "up" ? 2 : -2
      heatChange = 2
    } else {
      // 第一次投票
      setVoteState(new Map(voteState).set(id, direction))
      voteChange = direction === "up" ? 1 : -1
      heatChange = 2
    }
    
    // 更新本地状态
    setTopics(topics.map((t) =>
      t.id === id 
        ? { 
            ...t, 
            upvotes: direction === "up" 
              ? (currentVote === "up" ? t.upvotes - 1 : currentVote === "down" ? t.upvotes + 1 : t.upvotes + 1)
              : (currentVote === "up" ? t.upvotes - 1 : t.upvotes),
            downvotes: direction === "down"
              ? (currentVote === "down" ? t.downvotes - 1 : currentVote === "up" ? t.downvotes + 1 : t.downvotes + 1)
              : (currentVote === "down" ? t.downvotes - 1 : t.downvotes),
            heat: Math.max(0, Math.min(100, t.heat + heatChange))
          } 
        : t
    ))
    
    // 调用API
    try {
      const response = await fetch('/api/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 包含cookie
        body: JSON.stringify({ topicId: id, direction }),
      })
      const data = await response.json()
      if (!data.success) {
        // 如果API失败，回滚状态
        toast.error(data.error || '投票失败')
        // 重新获取数据
        const fetchResponse = await fetch(`/api/trending?sortBy=${sortBy}`)
        const fetchData = await fetchResponse.json()
        if (fetchData.success && fetchData.data) {
          setTopics(fetchData.data)
        }
      }
    } catch (error) {
      console.error('投票失败:', error)
      toast.error('投票失败，请稍后重试')
    }
  }

  const handleComment = (topicId: string) => {
    if (!isLoggedIn || !user) {
      toast.error("请先登录后再评论")
      return
    }
    if (!newCommentText.trim()) return
    const comment: TopicComment = {
      id: `temp_${Date.now()}`,
      author: user.name,
      avatar: getAvatarInitials(user.name, user.avatar),
      content: newCommentText,
      time: "刚刚",
    }
    setTopics(topics.map((t) =>
      t.id === topicId
        ? { ...t, comments: [...t.comments, comment], commentCount: (t.commentCount || 0) + 1, heat: Math.min(100, t.heat + 3) }
        : t
    ))
    setNewCommentText("")
    toast.success("评论成功！")
  }

  // 提议话题
  const handleProposeTopic = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再提议话题")
      return
    }
    if (!proposeForm.title.trim()) {
      toast.error("请输入话题标题")
      return
    }
    if (!proposeForm.description.trim()) {
      toast.error("请输入话题描述")
      return
    }
    
    setProposing(true)
    try {
      const response = await fetch('/api/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 包含cookie
        body: JSON.stringify({
          action: 'propose',
          title: proposeForm.title,
          description: proposeForm.description,
          category: proposeForm.category,
          tags: proposeForm.tags.split(',').map(t => t.trim()).filter(t => t),
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("话题提议成功，等待审核")
        setProposeDialogOpen(false)
        setProposeForm({ title: "", description: "", category: "技术选型", tags: "", voteType: "binary", options: "" })
      } else {
        toast.error(data.error || "提议话题失败")
      }
    } catch (error) {
      console.error('提议话题失败:', error)
      toast.error('提议话题失败，请稍后重试')
    } finally {
      setProposing(false)
    }
  }

  // 总投票数 = 所有话题的投票人数（ upvotes + downvotes ）
  const totalVotes = topics.reduce((sum, t) => sum + t.upvotes + t.downvotes, 0)
  // 参与人数 = 评论数 + 投票人数
  const totalParticipants = topics.length > 0 ? topics.reduce((sum, t) => sum + (t.commentCount || 0) + t.upvotes + t.downvotes, 0) : 0

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {loading ? (
          <>
            <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
              <Skeleton className="h-4 w-4 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
            <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
              <Skeleton className="h-4 w-4 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
            <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
              <Skeleton className="h-4 w-4 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
            <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
              <Skeleton className="h-4 w-4 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          </>
        ) : (
          [
            { icon: Calendar, label: "今日日期", value: today },
            { icon: Flame, label: "热门话题", value: `${topics.length} 个` },
            { icon: Users, label: "参与人数", value: `${totalParticipants}` },
            { icon: BarChart3, label: "总投票数", value: `${totalVotes}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
              <stat.icon className="h-4 w-4 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/50 mb-1">{stat.label}</p>
              <p className="text-sm font-bold font-mono text-foreground">{stat.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-muted-foreground/40">排序：</span>
        {([
          { key: "votes" as const, label: "票数", icon: ThumbsUp },
          { key: "heat" as const, label: "热度", icon: Flame },
          { key: "comments" as const, label: "讨论", icon: MessageSquare },
        ]).map((option) => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all duration-300 ${
              sortBy === option.key
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card/30 border-border/40 text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            <option.icon className="h-3 w-3" />
            {option.label}
          </button>
        ))}
      </div>

      {/* Topics list */}
      <div className="flex flex-col gap-4">
        {loading ? (
          // 加载骨架屏
          Array.from({ length: 3 }).map((_, i) => (
            <TopicSkeleton key={i} />
          ))
        ) : sortedTopics.length === 0 ? (
          // 空状态
          <div className="text-center py-12">
            <Flame className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无热榜话题</p>
            <p className="text-sm text-muted-foreground/50 mt-2">
              成为第一个提议话题的人吧！
            </p>
          </div>
        ) : (
          sortedTopics.map((topic, index) => {
            const isExpanded = expandedTopic === topic.id
            const currentVote = voteState.get(topic.id)

            return (
              <div
                key={topic.id}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "border-primary/25 bg-card/50"
                    : "border-border/40 bg-card/30 hover:border-border/60 hover:bg-card/40"
                }`}
              >
                <div className="p-6">
                  <div className="flex gap-4">
                    {/* Content - 无投票按钮，只在展开后显示投票 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold text-muted-foreground/30 font-mono">#{index + 1}</span>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${categoryColors[topic.category] || ""}`}>
                          {topic.category}
                        </Badge>
                        {topic.heat > 80 && (
                          <span className="flex items-center gap-1 text-[10px] text-destructive/70">
                            <Flame className="h-3 w-3" /> 火热
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-lg font-semibold text-foreground leading-snug mb-2 cursor-pointer hover:text-primary transition-colors duration-300"
                        onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                      >
                        {topic.title}
                      </h3>
                      <p className="text-sm text-muted-foreground/60 leading-relaxed mb-4">
                        {topic.description}
                      </p>

                      <div className="flex items-center gap-4 flex-wrap">
                        <HeatBar heat={topic.heat} />
                        <button
                          onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors duration-300"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {(topic.commentCount || topic.comments.length)} 条讨论
                        </button>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/30">
                          <Clock className="h-3 w-3" />
                          剩余 {topic.timeLeft}
                        </span>
                        <div className="flex gap-1.5 ml-auto">
                          {topic.tags.map((tag) => (
                            <span key={tag} className="text-[10px] font-mono text-primary/40">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded content with voting */}
                {isExpanded && (
                  <div className="border-t border-border/30">
                    <div className="p-6 pt-5 bg-card/20">
                      <div className="flex items-start gap-6">
                        {/* 讨论区 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">社区讨论</span>
                          </div>

                          {topic.comments.length > 0 ? (
                            <div className="flex flex-col gap-3 mb-5">
                              {topic.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 rounded-lg bg-background/30 p-3">
                                  <Avatar className="h-7 w-7 border border-border/30 shrink-0">
                                    <AvatarFallback className="text-[9px] font-mono bg-primary/8 text-primary/70">
                                      {comment.avatar || comment.author.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-xs font-medium ${comment.author === topic.proposedBy ? "text-primary" : "text-foreground/80"}`}>
                                        {comment.author}
                                      </span>
                                      {comment.author === topic.proposedBy && (
                                        <span className="text-[9px] font-mono px-1 py-0 rounded bg-primary/10 text-primary">作者</span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground/30">{comment.time}</span>
                                    </div>
                                    <p className="text-sm text-foreground/60 leading-relaxed">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground/30 mb-5 font-mono">{"// 暂无讨论，来发表第一条观点吧"}</p>
                          )}

                          {isLoggedIn ? (
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="分享你的观点..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                className="bg-background/30 border-border/40 focus:border-primary/40 min-h-[60px] resize-none rounded-lg text-sm flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleComment(topic.id)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 self-end h-9"
                              >
                                发送
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center py-3">
                              <Button size="sm" variant="outline" className="border-border/40 text-sm gap-1.5" onClick={() => toast.error("请先登录后参与讨论")}>
                                登录后参与讨论
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* 投票区域 - 右侧显示 */}
                        <div className="flex flex-col items-center gap-3 shrink-0 min-w-[140px]">
                          <span className="text-xs font-medium text-muted-foreground/50">观点投票</span>
                          {/* 赞同 */}
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => handleVote(topic.id, "up")}
                              disabled={!isLoggedIn}
                              className={`flex h-10 w-24 items-center justify-center rounded-lg border transition-all duration-300 gap-1 ${
                                currentVote === "up"
                                  ? "border-primary/50 bg-primary/20 text-primary"
                                  : "border-border/40 text-muted-foreground/60 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                              } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <ChevronUp className="h-4 w-4" />
                              <span className="text-sm font-medium">赞同</span>
                            </button>
                            <span className={`text-lg font-bold font-mono mt-1.5 ${
                              currentVote === "up" ? "text-primary" : 
                              "text-foreground"
                            }`}>
                              {topic.upvotes}
                            </span>
                          </div>
                          
                          {/* 否定 */}
                          <div className="flex flex-col items-center mt-2">
                            <button
                              onClick={() => handleVote(topic.id, "down")}
                              disabled={!isLoggedIn}
                              className={`flex h-10 w-24 items-center justify-center rounded-lg border transition-all duration-300 gap-1 ${
                                currentVote === "down"
                                  ? "border-destructive/50 bg-destructive/20 text-destructive"
                                  : "border-border/40 text-muted-foreground/60 hover:border-destructive/30 hover:text-destructive hover:bg-destructive/5"
                              } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <ChevronDown className="h-4 w-4" />
                              <span className="text-sm font-medium">否定</span>
                            </button>
                            <span className={`text-lg font-bold font-mono mt-1.5 ${
                              currentVote === "down" ? "text-destructive" : 
                              "text-foreground"
                            }`}>
                              {topic.downvotes}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Propose topic button */}
      <div className="mt-10 rounded-xl border border-dashed border-border/40 bg-card/20 p-8 text-center">
        <Zap className="h-8 w-8 text-primary/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">有想讨论的话题？</h3>
        <p className="text-sm text-muted-foreground/50 mb-5 max-w-md mx-auto">
          提出你感兴趣的技术话题，让社区一起讨论！
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-border/40 hover:border-primary/30 hover:bg-primary/5 gap-1.5"
          onClick={() => {
            if (!isLoggedIn) {
              toast.error("请先登录后再提议话题")
              return
            }
            setProposeDialogOpen(true)
          }}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          提议话题
        </Button>
      </div>

      {/* Propose topic dialog */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>提议新话题</DialogTitle>
            <DialogDescription>
              提出一个你感兴趣的技术话题，让社区一起讨论
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">话题标题</label>
              <Input
                placeholder="例如：Rust 能否取代 C++？"
                value={proposeForm.title}
                onChange={(e) => setProposeForm({ ...proposeForm, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">话题描述</label>
              <Textarea
                placeholder="详细描述你的观点和问题..."
                value={proposeForm.description}
                onChange={(e) => setProposeForm({ ...proposeForm, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">分类</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={proposeForm.category === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProposeForm({ ...proposeForm, category: cat.value })}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">标签（可选，用逗号分隔）</label>
              <Input
                placeholder="例如：Rust, C++, 系统编程"
                value={proposeForm.tags}
                onChange={(e) => setProposeForm({ ...proposeForm, tags: e.target.value })}
              />
            </div>

            {/* 投票类型选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">投票类型</label>
              <div className="flex gap-2">
                <Button
                  variant={proposeForm.voteType === "binary" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProposeForm({ ...proposeForm, voteType: "binary", options: "" })}
                >
                  赞同/否定
                </Button>
                <Button
                  variant={proposeForm.voteType === "multiple" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProposeForm({ ...proposeForm, voteType: "multiple" })}
                >
                  多选一
                </Button>
              </div>
            </div>

            {/* 投票选项 - 仅多选一类型显示 */}
            {proposeForm.voteType === "multiple" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">投票选项（每行一个选项）</label>
                <Textarea
                  placeholder="选项A&#10;选项B&#10;选项C"
                  value={proposeForm.options}
                  onChange={(e) => setProposeForm({ ...proposeForm, options: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleProposeTopic}
              disabled={proposing || !proposeForm.title.trim() || !proposeForm.description.trim()}
            >
              {proposing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交话题
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
