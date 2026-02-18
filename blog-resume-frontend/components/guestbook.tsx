"use client"

import { useState } from "react"
import { Send, Heart, Trash2, LogIn } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"
import { useAuth, incrementStat } from "@/lib/auth-store"

const initialMessages = [
  {
    id: 1,
    author: "陈思远",
    avatar: "CS",
    message: "你关于 Linux 内存管理的文章对我的毕业论文研究非常有帮助。感谢你如此清晰的讲解！",
    date: "2026 年 2 月 15 日",
    likes: 23,
    isAdmin: false,
  },
  {
    id: 2,
    author: "Marcus Weber",
    avatar: "MW",
    message: "刚刚通过 Hacker News 发现了这个博客。你的技术写作质量非常出色。已订阅，期待更多内核深度分析。",
    date: "2026 年 2 月 12 日",
    likes: 18,
    isAdmin: false,
  },
  {
    id: 3,
    author: "SysLog",
    avatar: "SL",
    message: "欢迎来到留言板！随时留下你的想法、提问或分享你在系统编程方面的经验。",
    date: "2026 年 2 月 1 日",
    likes: 45,
    isAdmin: true,
  },
  {
    id: 4,
    author: "田中优希",
    avatar: "TZ",
    message: "RISC-V 模拟器项目太棒了。我一直在学习计算机体系结构，你的代码文档写得非常好。准备提交我的第一个 PR！",
    date: "2026 年 1 月 28 日",
    likes: 15,
    isAdmin: false,
  },
  {
    id: 5,
    author: "李明轩",
    avatar: "LM",
    message: "希望能看到一篇关于 eBPF 程序验证器的文章。eBPF 可观测性那篇很棒，但我对验证器内部实现更好奇。",
    date: "2026 年 1 月 20 日",
    likes: 31,
    isAdmin: false,
  },
  {
    id: 6,
    author: "Priya Patel",
    avatar: "PP",
    message: "你的异步运行时文章比任何我读过的文档都更好地帮我理解了 Rust futures。请继续保持！",
    date: "2026 年 1 月 15 日",
    likes: 27,
    isAdmin: false,
  },
]

export function Guestbook() {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [likedMessages, setLikedMessages] = useState<Set<number>>(new Set())
  const { user, isLoggedIn } = useAuth()

  const handleSubmit = () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再留言")
      return
    }
    if (!newMessage.trim()) {
      toast.error("请输入留言内容")
      return
    }

    const message = {
      id: Date.now(),
      author: user!.username,
      avatar: user!.avatar,
      message: newMessage,
      date: new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }),
      likes: 0,
      isAdmin: user!.role === "admin",
    }

    setMessages([message, ...messages])
    setNewMessage("")
    incrementStat("comments")
    toast.success("留言成功！")
  }

  const handleLike = (id: number) => {
    if (likedMessages.has(id)) {
      setLikedMessages((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setMessages(messages.map((m) => (m.id === id ? { ...m, likes: m.likes - 1 } : m)))
    } else {
      setLikedMessages(new Set([...likedMessages, id]))
      setMessages(messages.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m)))
    }
  }

  const handleDelete = (id: number) => {
    setMessages(messages.filter((m) => m.id !== id))
    toast.success("留言已删除")
  }

  return (
    <div>
      {/* Post form */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-7 mb-10 card-glow">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/15">
            <Send className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">写下你的留言</h3>
        </div>

        {isLoggedIn && user ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6 border border-border/30">
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-mono">{user.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground/70">{user.username}</span>
            </div>
            <Textarea
              placeholder="留下你的想法、建议或任何想说的话..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="bg-background/30 border-border/40 focus:border-primary/40 min-h-[90px] resize-none rounded-lg transition-all duration-300"
            />
            <div className="flex items-center justify-end">
              <Button
                onClick={handleSubmit}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/15"
              >
                <Send className="h-3.5 w-3.5" />
                发送留言
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground/50 mb-4">登录后即可留言互动</p>
            <Link href="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                前往登录
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Messages count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground/40 font-mono">
          共 {messages.length} 条留言
        </p>
      </div>

      {/* Messages list */}
      <div className="flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group rounded-xl border p-5 transition-all duration-300 ${
              msg.isAdmin
                ? "border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06]"
                : "border-border/30 bg-card/20 hover:bg-card/40 hover:border-border/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9 border border-border/40 shrink-0">
                <AvatarFallback
                  className={`text-xs font-mono ${
                    msg.isAdmin
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/50 text-muted-foreground/60"
                  }`}
                >
                  {msg.avatar}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-sm font-medium ${msg.isAdmin ? "text-primary" : "text-foreground/90"}`}>
                    {msg.author}
                  </span>
                  {msg.isAdmin && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                      作者
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/30">{msg.date}</span>
                </div>
                <p className="text-sm text-foreground/65 leading-relaxed">
                  {msg.message}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleLike(msg.id)}
                    className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
                      likedMessages.has(msg.id)
                        ? "text-destructive"
                        : "text-muted-foreground/30 hover:text-destructive"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${likedMessages.has(msg.id) ? "fill-current" : ""}`} />
                    {msg.likes}
                  </button>
                  {isLoggedIn && user && (user.role === "admin" || msg.author === user.username) && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/20 hover:text-destructive transition-colors duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
