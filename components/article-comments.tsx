"use client"

import { useState, useEffect } from "react"
import { MessageSquare, ThumbsUp, Reply, ChevronDown, ChevronUp, Send, Trash2, Pencil, Loader2, Check, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  return new Date(date).toLocaleDateString("zh-CN")
}

interface Author {
  id: string
  name: string
  avatar: string
  isAdmin: boolean
}

interface Comment {
  id: string
  content: string
  createdAt: Date
  author: Author
  replies: Comment[]
}

interface ArticleCommentsProps {
  postId: string
}

function CommentItem({
  comment,
  depth,
  likedSet,
  onLike,
  onReply,
  onDelete,
  onEdit,
  currentUserId,
}: {
  comment: Comment
  depth: number
  likedSet: Set<string>
  onLike: (id: string) => void
  onReply: (parentId: string, content: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  currentUserId?: string
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [showReplies, setShowReplies] = useState(depth < 1)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [isSaving, setIsSaving] = useState(false)
  const { isLoggedIn } = useAuth()

  const handleReply = () => {
    if (!replyText.trim()) return
    onReply(comment.id, replyText)
    setReplyText("")
    setShowReplyInput(false)
  }

  // 处理编辑保存
  const handleEditSave = async () => {
    if (!editText.trim() || editText === comment.content) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onEdit(comment.id, editText)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const isAuthor = comment.author.isAdmin
  const canEdit = currentUserId && (currentUserId === comment.author.id || comment.author.isAdmin)
  const canDelete = currentUserId && (currentUserId === comment.author.id || comment.author.isAdmin)

  return (
    <div className={`${depth > 0 ? "ml-8 pl-4 border-l border-border/20" : ""}`}>
      <div className="rounded-xl border border-border/30 bg-card/20 p-5 transition-all duration-300 hover:bg-card/40 hover:border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 border border-border/40">
            <AvatarFallback className={`text-xs font-mono ${isAuthor ? "bg-primary/15 text-primary" : "bg-primary/8 text-primary/80"}`}>
              {comment.author.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium font-mono ${isAuthor ? "text-primary" : "text-foreground/90"}`}>
              {comment.author.name}
            </span>
            {isAuthor && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                作者
              </span>
            )}
            <span className="text-xs text-muted-foreground/40">{formatTime(comment.createdAt)}</span>
          </div>
        </div>
        {/* 内容：编辑模式或显示模式 */}
        {isEditing ? (
          <div className="mt-3 pl-11">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="bg-background/30 border-border/40 focus:border-primary/40 min-h-[80px] resize-none rounded-lg text-sm mb-2"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleEditSave}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-border/40 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                取消
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/70 leading-relaxed mb-4 pl-11">
            {comment.content}
          </p>
        )}
        <div className="flex items-center gap-4 pl-11">
          <button
            onClick={() => onLike(comment.id)}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
              likedSet.has(comment.id) ? "text-primary" : "text-muted-foreground/40 hover:text-primary"
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${likedSet.has(comment.id) ? "fill-current" : ""}`} />
            点赞
          </button>
          <button
            onClick={() => {
              if (!isLoggedIn) {
                toast.error("请先登录后再回复")
                return
              }
              setShowReplyInput(!showReplyInput)
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors duration-300"
          >
            <Reply className="h-3.5 w-3.5" />
            回复
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/20 hover:text-destructive transition-colors duration-300"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setEditText(comment.content)
                setIsEditing(true)
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/20 hover:text-primary transition-colors duration-300"
            >
              <Pencil className="h-3 w-3" />
              编辑
            </button>
          )}
            {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-primary transition-colors duration-300 ml-auto"
            >
              {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {comment.replies.length} 条回复
            </button>
          )}
        </div>

        {showReplyInput && (
          <div className="mt-4 pl-11 flex gap-2">
            <Textarea
              placeholder="写下你的回复..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="bg-background/30 border-border/40 focus:border-primary/40 min-h-[70px] resize-none rounded-lg text-sm flex-1"
            />
            <div className="flex flex-col gap-1.5">
              <Button size="sm" onClick={handleReply} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8 p-0">
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReplyInput(false)} className="h-8 w-8 p-0 text-muted-foreground/40">
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col gap-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              likedSet={likedSet}
              onLike={onLike}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ArticleComments({ postId }: ArticleCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const { user, isLoggedIn } = useAuth()

  // 加载评论
  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/comments?postId=${postId}`)
      const result = await response.json()
      if (result.success) {
        setComments(result.data)
      }
    } catch (error) {
      console.error("加载评论失败:", error)
      toast.error("加载评论失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再发表评论")
      return
    }
    if (!newComment.trim()) {
      toast.error("请输入评论内容")
      return
    }

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content: newComment,
        }),
      })
      const result = await response.json()
      if (result.success) {
        setNewComment("")
        toast.success("评论发表成功！")
        loadComments()
      } else {
        toast.error(result.error || "发表评论失败")
      }
    } catch (error) {
      console.error("发表评论失败:", error)
      toast.error("发表评论失败")
    }
  }

  const handleLike = (id: string) => {
    if (likedComments.has(id)) {
      setLikedComments((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else {
      setLikedComments(new Set([...likedComments, id]))
    }
  }

  const handleReply = async (parentId: string, content: string) => {
    if (!user) return

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content,
          parentId,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success("回复成功！")
        loadComments()
      } else {
        toast.error(result.error || "回复失败")
      }
    } catch (error) {
      console.error("回复失败:", error)
      toast.error("回复失败")
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？")) return

    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (result.success) {
        toast.success("评论已删除")
        loadComments()
      } else {
        toast.error(result.error || "删除评论失败")
      }
    } catch (error) {
      console.error("删除评论失败:", error)
      toast.error("删除评论失败")
    }
  }

  // 处理评论编辑
  const handleEdit = async (commentId: string, content: string) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId, content }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('评论已更新')
        loadComments()
      } else {
        toast.error(result.error || '修改评论失败')
      }
    } catch (error) {
      console.error('修改评论失败:', error)
      toast.error('修改评论失败')
    }
  }

  // 计算评论总数（包括回复）
  const totalCount = (items: Comment[]): number => {
    if (!items || !Array.isArray(items)) return 0
    return items.reduce((sum, c) => sum + 1 + totalCount(c.replies || []), 0)
  }

  return (
    <section className="mt-20">
      <Separator className="mb-10 bg-border/30" />
      <div className="flex items-center gap-2.5 mb-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/15">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          评论区 <span className="text-muted-foreground/40 font-normal text-base ml-1">({totalCount(comments)})</span>
        </h2>
      </div>

      {/* Comment form */}
      <div className="mb-10 rounded-xl border border-border/40 bg-card/30 p-6">
        {isLoggedIn && user ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-8 w-8 border border-border/40">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-mono">
                  {getAvatarInitials(user.name, user.avatar)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground/80">{user.name}</span>
            </div>
            <Textarea
              placeholder="分享你的看法..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="bg-background/30 border-border/40 focus:border-primary/40 min-h-[110px] mb-4 resize-none rounded-lg transition-all duration-300"
            />
            <div className="flex items-center justify-end">
              <Button
                onClick={handleSubmitComment}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/15"
              >
                <Send className="h-3.5 w-3.5" />
                发表评论
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground/50 mb-4">
              登录后即可参与讨论
            </p>
            <Link href="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                前往登录
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground/40">加载中...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground/40">暂无评论，快来发表第一条评论吧！</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              likedSet={likedComments}
              onLike={handleLike}
              onReply={handleReply}
              onDelete={handleDelete}
              onEdit={handleEdit}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}
