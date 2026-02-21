"use client"

import { useState, useEffect } from "react"
import { Send, Heart, Trash2, LogIn, ChevronDown, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"
import { useAuth } from "@/lib/auth-store"

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

// 格式化时间
function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return new Date(date).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
}

interface Author {
  id: string
  name: string
  avatar: string
  isAdmin: boolean
}

interface GuestbookEntry {
  id: string
  message: string
  createdAt: Date
  author: Author
}

export function Guestbook() {
  const [messages, setMessages] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalMessages, setTotalMessages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const { user, isLoggedIn } = useAuth()
  const MESSAGES_PER_PAGE = 15

  // 加载留言
  useEffect(() => {
    loadMessages(1)
  }, [])

  const loadMessages = async (page: number = 1) => {
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      const response = await fetch(`/api/guestbook?page=${page}&limit=${MESSAGES_PER_PAGE}`)
      const result = await response.json()
      if (result.success) {
        if (page === 1) {
          setMessages(result.data.entries)
        } else {
          setMessages(prev => [...prev, ...result.data.entries])
        }
        setTotalMessages(result.data.total || 0)
        setHasMore(result.data.entries.length === MESSAGES_PER_PAGE)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error("加载留言失败:", error)
      toast.error("加载留言失败")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadMessages(currentPage + 1)
    }
  }

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再留言")
      return
    }
    if (!newMessage.trim()) {
      toast.error("请输入留言内容")
      return
    }

    try {
      const response = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newMessage,
        }),
      })
      const result = await response.json()
      if (result.success) {
        setNewMessage("")
        toast.success("留言成功！")
        loadMessages(1)
      } else {
        toast.error(result.error || "留言失败")
      }
    } catch (error) {
      console.error("留言失败:", error)
      toast.error("留言失败")
    }
  }

  const handleLike = (id: string) => {
    if (likedMessages.has(id)) {
      setLikedMessages((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else {
      setLikedMessages(new Set([...likedMessages, id]))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条留言吗？")) return

    try {
      const response = await fetch(`/api/guestbook/${id}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (result.success) {
        toast.success("留言已删除")
        loadMessages(1)
      } else {
        toast.error(result.error || "删除留言失败")
      }
    } catch (error) {
      console.error("删除留言失败:", error)
      toast.error("删除留言失败")
    }
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
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-mono">
                  {getAvatarInitials(user.name, user.avatar)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground/70">{user.name}</span>
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
          共 {totalMessages > 0 ? totalMessages : messages.length} 条留言
        </p>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground/40">加载中...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground/40">暂无留言，快来留下第一条留言吧！</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`group rounded-xl border p-5 transition-all duration-300 ${
                  msg.author.isAdmin
                    ? "border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06]"
                    : "border-border/30 bg-card/20 hover:bg-card/40 hover:border-border/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border border-border/40 shrink-0">
                    <AvatarFallback
                      className={`text-xs font-mono ${
                        msg.author.isAdmin
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary/50 text-muted-foreground/60"
                      }`}
                    >
                      {msg.author.avatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-sm font-medium ${msg.author.isAdmin ? "text-primary" : "text-foreground/90"}`}>
                        {msg.author.name}
                      </span>
                      {msg.author.isAdmin && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                          作者
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/30">{formatTime(msg.createdAt)}</span>
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
                        点赞
                      </button>
                      {isLoggedIn && user && (user.isAdmin || msg.author.id === user.id) && (
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
          {/* 加载更多按钮 */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="outline"
                className="border-border/40 gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载中...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    加载更多
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
