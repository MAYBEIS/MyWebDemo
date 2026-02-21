"use client"

import { useState } from "react"
import { Search, Trash2, RefreshCw, MessageSquare, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import Link from "next/link"

interface Author {
  id: string
  name: string
  avatar: string | null
  isAdmin: boolean
}

interface Post {
  id: string
  title: string
  slug: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: Author
  post: Post
  parentId: string | null
  replyCount: number
}

interface CommentsManagerProps {
  initialComments: Comment[]
}

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
function formatTime(date: string): string {
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
  return new Date(date).toLocaleDateString("zh-CN")
}

export function CommentsManager({ initialComments }: CommentsManagerProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // 过滤评论
  const filteredComments = comments.filter(comment =>
    comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comment.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comment.post.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 删除评论
  const handleDelete = async (comment: Comment) => {
    if (!confirm(`确定要删除这条评论吗？此操作不可撤销。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/comments/${comment.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "删除失败")
      }

      toast.success("评论已删除")
      setComments(comments.filter(c => c.id !== comment.id))
    } catch (error) {
      console.error("删除评论失败:", error)
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }

  // 刷新评论列表
  const refreshComments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/comments", { credentials: "include" })
      const data = await response.json()
      if (data.success) {
        setComments(data.data.comments)
      }
    } catch (error) {
      console.error("刷新评论列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">评论管理</h1>
          <p className="text-sm text-muted-foreground/60 mt-1">
            共 {comments.length} 条评论
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshComments}
          disabled={isLoading}
          className="gap-2 border-border/40"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="搜索评论内容、作者或文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card/30 border-border/40"
        />
      </div>

      {/* 评论列表 */}
      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-card/50">
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">评论内容</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">作者</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">文章</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">类型</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">时间</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground/60">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredComments.map((comment) => (
              <tr
                key={comment.id}
                className="border-b border-border/20 last:border-0 hover:bg-card/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/80 line-clamp-2 max-w-md">
                      {comment.content}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border border-border/40">
                      <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-mono">
                        {getAvatarInitials(comment.author.name, comment.author.avatar)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{comment.author.name}</span>
                      {comment.author.isAdmin && (
                        <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                          管理员
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/blog/${comment.post.slug}`}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="line-clamp-1 max-w-[150px]">{comment.post.title}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {comment.parentId ? (
                    <Badge variant="secondary" className="bg-muted/20 text-muted-foreground text-xs">
                      回复 ({comment.replyCount})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border/40 text-muted-foreground/60 text-xs">
                      主评论 ({comment.replyCount})
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground/50">
                    {formatTime(comment.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment)}
                      className="h-8 w-8 p-0 hover:text-destructive"
                      title="删除评论"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground/60" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredComments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground/40">
                  {searchQuery ? "没有找到匹配的评论" : "暂无评论"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
