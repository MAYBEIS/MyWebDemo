"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageCircle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 最近评论类型
interface RecentComment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  post: {
    id: string
    title: string
    slug: string
  }
}

/**
 * 格式化时间为相对时间
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  // 超过7天显示具体日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 获取用户名首字母
 */
function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

export function RecentComments() {
  const [comments, setComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchRecentComments() {
      try {
        setLoading(true)
        const response = await fetch('/api/comments/recent?limit=5', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('获取评论失败')
        }

        const result = await response.json()
        if (result.success) {
          setComments(result.data)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('获取最近评论失败:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentComments()
  }, [])

  // 加载状态
  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-4 w-4 text-primary/60" />
          <h3 className="text-sm font-semibold text-foreground">最近评论</h3>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      </div>
    )
  }

  // 错误或无数据状态
  if (error || comments.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-4 w-4 text-primary/60" />
          <h3 className="text-sm font-semibold text-foreground">最近评论</h3>
        </div>
        <p className="text-xs text-muted-foreground/50 text-center py-4">
          暂无评论
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-primary/60" />
        <h3 className="text-sm font-semibold text-foreground">最近评论</h3>
      </div>
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="group">
            <div className="flex items-start gap-3">
              {/* 用户头像 */}
              <Avatar className="h-7 w-7 border border-border/40">
                <AvatarImage src={comment.author.image || undefined} alt={comment.author.name || ''} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(comment.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {/* 评论内容 */}
                <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                  <span className="font-medium text-foreground/80">{comment.author.name}</span>
                  {' · '}
                  {comment.content}
                </p>
                {/* 文章标题和时间 */}
                <div className="flex items-center gap-2 mt-1.5">
                  <Link
                    href={`/blog/${comment.post.slug}`}
                    className="text-[10px] text-primary/70 hover:text-primary transition-colors truncate max-w-[150px]"
                  >
                    {comment.post.title}
                  </Link>
                  <span className="text-[10px] text-muted-foreground/40">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}