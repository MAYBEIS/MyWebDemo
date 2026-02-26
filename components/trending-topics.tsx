"use client"

import { useState, useMemo } from "react"
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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-store"
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

interface TopicComment {
  id: number
  author: string
  avatar: string
  content: string
  time: string
}

interface Topic {
  id: number
  title: string
  description: string
  category: string
  votes: number
  heat: number
  comments: TopicComment[]
  tags: string[]
  proposedBy: string
  timeLeft: string
}

const today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })

const initialTopics: Topic[] = [
  {
    id: 1,
    title: "Rust 能否取代 C 成为内核开发的主力语言？",
    description: "随着 Rust for Linux 项目的推进，越来越多的内核模块开始用 Rust 编写。你认为 Rust 最终能取代 C 在内核开发中的地位吗？",
    category: "语言之争",
    votes: 247,
    heat: 98,
    comments: [
      { id: 101, author: "kernel_dev", avatar: "KD", content: "C 在内核中的生态太成熟了，短期内不可能替代，但 Rust 作为补充非常合适。", time: "3 小时前" },
      { id: 102, author: "rust_fan", avatar: "RF", content: "所有权模型天然适合内核开发，Use-after-free 这种 bug 直接在编译期消除。", time: "2 小时前" },
      { id: 103, author: "SysLog", avatar: "SL", content: "我认为两者会长期共存。新模块用 Rust 写是趋势，但重写已有代码不现实。", time: "1 小时前" },
    ],
    tags: ["Rust", "C", "Linux 内核"],
    proposedBy: "SysLog",
    timeLeft: "16 小时",
  },
  {
    id: 2,
    title: "io_uring vs epoll：下一代 I/O 多路复用的选择",
    description: "io_uring 提供了更统一和高效的异步 I/O 接口，但 epoll 更成熟稳定。在新项目中你会选择哪个？",
    category: "技术选型",
    votes: 183,
    heat: 85,
    comments: [
      { id: 201, author: "perf_guru", avatar: "PG", content: "io_uring 在高并发场景下吞吐量提升 30%+，没有理由不用。", time: "5 小时前" },
      { id: 202, author: "old_school", avatar: "OS", content: "epoll 经过二十年实战验证，io_uring 的安全问题值得警惕。", time: "4 小时前" },
    ],
    tags: ["io_uring", "epoll", "Linux"],
    proposedBy: "perf_guru",
    timeLeft: "16 小时",
  },
  {
    id: 3,
    title: "eBPF 是否是可观测性的终极解决方案？",
    description: "eBPF 允许在内核中安全运行自定义程序，正在革新系统监控和安全领域。你怎么看它的未来？",
    category: "前沿技术",
    votes: 156,
    heat: 79,
    comments: [
      { id: 301, author: "observability_pro", avatar: "OP", content: "eBPF 不只是可观测性，它在安全、网络方面的应用同样革命性。", time: "6 小时前" },
    ],
    tags: ["eBPF", "可观测性", "安全"],
    proposedBy: "observability_pro",
    timeLeft: "16 小时",
  },
  {
    id: 4,
    title: "RISC-V 会成为下一个 ARM 吗？",
    description: "RISC-V 的开放指令集架构正在快速发展。从嵌入式到服务器，RISC-V 能在多大程度上挑战 ARM 和 x86 的地位？",
    category: "硬件架构",
    votes: 134,
    heat: 72,
    comments: [
      { id: 401, author: "chip_designer", avatar: "CD", content: "开放 ISA 是巨大优势，但生态建设还需要时间。5-10 年内会有显著变化。", time: "8 小时前" },
      { id: 402, author: "embedded_dev", avatar: "ED", content: "在嵌入式领域 RISC-V 已经有很好的应用了，MCU 市场正在快速增长。", time: "7 小时前" },
    ],
    tags: ["RISC-V", "ARM", "ISA"],
    proposedBy: "chip_designer",
    timeLeft: "16 小时",
  },
  {
    id: 5,
    title: "WebAssembly 能否成为服务端的通用运行时？",
    description: "WASI 和 Component Model 正在让 Wasm 超越浏览器。作为服务端沙箱运行时，它能取代容器吗？",
    category: "新方向",
    votes: 98,
    heat: 61,
    comments: [],
    tags: ["Wasm", "WASI", "云原生"],
    proposedBy: "cloud_native",
    timeLeft: "16 小时",
  },
  {
    id: 6,
    title: "你最想学的下一门系统编程语言是什么？",
    description: "Zig、Nim、Odin、Hare... 新的系统编程语言层出不穷。除了 C 和 Rust，你最想深入学习哪一门？",
    category: "语言之争",
    votes: 89,
    heat: 55,
    comments: [
      { id: 601, author: "polyglot", avatar: "PL", content: "Zig，编译速度快，和 C 的互操作性好，错误处理模型优雅。", time: "10 小时前" },
    ],
    tags: ["Zig", "Nim", "编程语言"],
    proposedBy: "polyglot",
    timeLeft: "16 小时",
  },
]

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

export function TrendingTopics() {
  const [topics, setTopics] = useState(initialTopics)
  // 使用Map记录每个话题的投票状态：undefined=未投票, 'up'=赞同, 'down'=反对
  const [voteState, setVoteState] = useState<Map<number, 'up' | 'down'>>(new Map())
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [sortBy, setSortBy] = useState<"votes" | "heat" | "comments">("votes")
  const { user, isLoggedIn } = useAuth()

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      if (sortBy === "votes") return b.votes - a.votes
      if (sortBy === "heat") return b.heat - a.heat
      return b.comments.length - a.comments.length
    })
  }, [topics, sortBy])

  const handleVote = (id: number, direction: "up" | "down") => {
    if (!isLoggedIn) {
      toast.error("请先登录后再投票")
      return
    }
    const currentVote = voteState.get(id)
    
    if (currentVote === direction) {
      // 如果点击的是相同方向，则取消投票
      const newVoteState = new Map(voteState)
      newVoteState.delete(id)
      setVoteState(newVoteState)
      
      setTopics(topics.map((t) =>
        t.id === id 
          ? { ...t, votes: t.votes + (direction === "up" ? -1 : 1), heat: Math.max(0, t.heat - 2) } 
          : t
      ))
    } else if (currentVote) {
      // 如果已经投过相反的票，切换投票方向
      setVoteState(new Map(voteState).set(id, direction))
      
      setTopics(topics.map((t) =>
        t.id === id 
          ? { ...t, votes: t.votes + (direction === "up" ? 2 : -2), heat: Math.min(100, t.heat + 2) } 
          : t
      ))
    } else {
      // 第一次投票
      setVoteState(new Map(voteState).set(id, direction))
      
      setTopics(topics.map((t) =>
        t.id === id 
          ? { ...t, votes: t.votes + (direction === "up" ? 1 : -1), heat: Math.min(100, t.heat + 2) } 
          : t
      ))
    }
  }

  const handleComment = (topicId: number) => {
    if (!isLoggedIn || !user) {
      toast.error("请先登录后再评论")
      return
    }
    if (!newCommentText.trim()) return
    const comment: TopicComment = {
      id: Date.now(),
      author: user.name,
      avatar: getAvatarInitials(user.name, user.avatar),
      content: newCommentText,
      time: "刚刚",
    }
    setTopics(topics.map((t) =>
      t.id === topicId
        ? { ...t, comments: [...t.comments, comment], heat: Math.min(100, t.heat + 3) }
        : t
    ))
    setNewCommentText("")
    toast.success("评论成功！")
  }

  const totalVotes = topics.reduce((sum, t) => sum + t.votes, 0)
  const totalParticipants = 156

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {[
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
        ))}
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
        {sortedTopics.map((topic, index) => {
          const isExpanded = expandedTopic === topic.id
          const currentVote = voteState.get(topic.id)
          const isVoted = currentVote !== undefined

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
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleVote(topic.id, "up")}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 ${
                        currentVote === "up"
                          ? "border-primary/50 bg-primary/20 text-primary"
                          : "border-border/40 text-muted-foreground/40 hover:border-primary/20 hover:text-primary"
                      }`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className={`text-sm font-bold font-mono ${
                      currentVote === "up" ? "text-primary" : 
                      currentVote === "down" ? "text-destructive" : 
                      "text-foreground"
                    }`}>
                      {topic.votes}
                    </span>
                    <button
                      onClick={() => handleVote(topic.id, "down")}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 ${
                        currentVote === "down"
                          ? "border-destructive/50 bg-destructive/20 text-destructive"
                          : "border-border/30 text-muted-foreground/40 hover:border-destructive/20 hover:text-destructive"
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Content */}
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
                        {topic.comments.length} 条讨论
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

              {/* Expanded comments */}
              {isExpanded && (
                <div className="border-t border-border/30 p-6 pt-5">
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
                              {comment.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${comment.author === "SysLog" ? "text-primary" : "text-foreground/80"}`}>
                                {comment.author}
                              </span>
                              {comment.author === "SysLog" && (
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
                      <Link href="/login">
                        <Button size="sm" variant="outline" className="border-border/40 text-sm gap-1.5">
                          登录后参与讨论
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Propose topic */}
      <div className="mt-10 rounded-xl border border-dashed border-border/40 bg-card/20 p-8 text-center">
        <Zap className="h-8 w-8 text-primary/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">有想讨论的话题？</h3>
        <p className="text-sm text-muted-foreground/50 mb-5 max-w-md mx-auto">
          如果你有想和社区一起讨论的系统编程话题，可以在留言板中提议，获得足够关注后会出现在热榜中。
        </p>
        <Link href="/guestbook">
          <Button variant="outline" size="sm" className="border-border/40 hover:border-primary/30 hover:bg-primary/5 gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            去提议话题
          </Button>
        </Link>
      </div>
    </div>
  )
}
