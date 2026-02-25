"use client"

import { useState, useEffect } from "react"
import { MessageSquare, ThumbsUp, Reply, ChevronDown, ChevronUp, Send, Trash2, Pencil, Loader2, Check, X, RotateCcw } from "lucide-react"
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
  likes: number
  isRecalled: boolean
  isLiked: boolean
  author: Author
  replies: Comment[]
}

interface ArticleCommentsProps {
  postId: string
}

interface CommentResponse {
  id: string
  content: string
  createdAt: Date
  likes: number
  isRecalled: boolean
  isLiked: boolean
  author: Author
  replies: Comment[]
}

interface ApiResponse {
  success: boolean
  data: CommentResponse[]
  total: number
  page: number
  limit: number
  maxDepth: number
  hasHiddenComments: boolean
}

function CommentItem({
  comment,
  depth,
  onLike,
  onReply,
  onDelete,
  onEdit,
  onRecall,
  currentUserId,
  isAdmin,
  maxDepth,
}: {
  comment: Comment
  depth: number
  onLike: (id: string, isLiked: boolean) => void
  onReply: (parentId: string, content: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  onRecall: (id: string) => void
  currentUserId?: string
  isAdmin?: boolean
  maxDepth: number
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  // 顶级评论(depth=0)默认折叠(展开为false)，子评论默认展开(展开为true)
  const [showReplies, setShowReplies] = useState(depth === 0 ? false : true)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
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

  // 处理点赞
  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    try {
      await onLike(comment.id, comment.isLiked)
    } finally {
      setIsLiking(false)
    }
  }

  const isAuthor = comment.author.isAdmin
  // 只有评论作者本人可以编辑自己的评论（且评论未撤回）
  const canEdit = currentUserId && currentUserId === comment.author.id && !comment.isRecalled
  // 评论作者可以撤回自己的评论（且评论未撤回）
  const canRecall = currentUserId && currentUserId === comment.author.id && !comment.isRecalled
  // 只有管理员可以删除评论
  const canDelete = isAdmin

  return (
    <div className={`${depth > 0 ? "ml-8 pl-4 border-l border-border/20" : ""}`}>
      <div className={`rounded-xl border border-border/30 bg-card/20 p-5 transition-all duration-300 hover:bg-card/40 hover:border-border/50 ${comment.isRecalled ? 'opacity-60' : ''}`}>
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
            {comment.isRecalled && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground border border-border/15">
                已撤回
              </span>
            )}
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
          <p className={`text-sm leading-relaxed mb-4 pl-11 ${comment.isRecalled ? 'text-muted-foreground/50 italic' : 'text-foreground/70'}`}>
            {comment.content}
          </p>
        )}
        <div className="flex items-center gap-4 pl-11">
          {/* 点赞按钮 */}
          <button
            onClick={handleLike}
            disabled={isLiking || !isLoggedIn}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
              comment.isLiked 
                ? "text-primary" 
                : "text-muted-foreground/40 hover:text-primary"
            } ${!isLoggedIn ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
            点赞 {comment.likes > 0 && `(${comment.likes})`}
          </button>
          {/* 回复按钮 */}
          {!comment.isRecalled && (
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  toast.error("请先登录后再回复")
                  return
                }
                setShowReplyInput(true)
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors duration-300"
            >
              <Reply className="h-3.5 w-3.5" />
              回复
            </button>
          )}
          {/* 删除按钮 - 仅管理员可见 */}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/20 hover:text-destructive transition-colors duration-300"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
          )}
          {/* 编辑按钮 - 仅评论作者可见 */}
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
          {/* 撤回按钮 - 仅评论作者可见 */}
          {canRecall && (
            <button
              onClick={() => onRecall(comment.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/20 hover:text-orange-500 transition-colors duration-300"
            >
              <RotateCcw className="h-3 w-3" />
              撤回
            </button>
          )}
          {/* 展开回复 */}
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
              onLike={onLike}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onRecall={onRecall}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              maxDepth={maxDepth}
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [maxDepth, setMaxDepth] = useState(3)
  const [hasHiddenComments, setHasHiddenComments] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalComments, setTotalComments] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const { user, isLoggedIn } = useAuth()
  const COMMENTS_PER_PAGE = 10

  // 加载评论
  useEffect(() => {
    loadComments(1)
  }, [postId])

  const loadComments = async (page: number = 1) => {
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      const response = await fetch(`/api/comments?postId=${postId}&page=${page}&limit=${COMMENTS_PER_PAGE}`)
      const result = await response.json() as ApiResponse
      if (result.success) {
        if (page === 1) {
          setComments(result.data)
        } else {
          setComments(prev => [...prev, ...result.data])
        }
        // 从 API 获取最大深度设置
        setMaxDepth(result.maxDepth || 3)
        setHasHiddenComments(result.hasHiddenComments || false)
        setTotalComments(result.total || 0)
        setHasMore(result.data.length === COMMENTS_PER_PAGE)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error("加载评论失败:", error)
      toast.error("加载评论失败")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadComments(currentPage + 1)
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
        loadComments(1)
      } else {
        toast.error(result.error || "发表评论失败")
      }
    } catch (error) {
      console.error("发表评论失败:", error)
      toast.error("发表评论失败")
    }
  }

  // 处理点赞
  const handleLike = async (id: string, isLiked: boolean) => {
    if (!isLoggedIn) {
      toast.error("请先登录后再点赞")
      return
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          action: isLiked ? 'unlike' : 'like' 
        }),
      })
      const result = await response.json()
      if (result.success) {
        // 更新本地状态
        setComments(prev => updateCommentLike(prev, id, !isLiked))
        toast.success(isLiked ? '取消点赞' : '点赞成功')
      } else {
        toast.error(result.error || '操作失败')
      }
    } catch (error) {
      console.error('点赞失败:', error)
      toast.error('操作失败')
    }
  }

  // 递归更新评论的点赞状态
  const updateCommentLike = (comments: Comment[], targetId: string, isLiked: boolean): Comment[] => {
    return comments.map(comment => {
      if (comment.id === targetId) {
        return {
          ...comment,
          isLiked,
          likes: isLiked ? comment.likes + 1 : comment.likes - 1
        }
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLike(comment.replies, targetId, isLiked)
        }
      }
      return comment
    })
  }

  // 处理评论回复
  const handleReply = async (parentId: string, content: string) => {
    if (!user) {
      toast.error("请先登录后再回复")
      return
    }

    if (!parentId) {
      toast.error("评论 ID 无效")
      return
    }

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
        loadComments(1)
      } else {
        toast.error(result.error || "回复失败")
      }
    } catch (error) {
      console.error("回复失败:", error)
      toast.error("回复失败，请稍后重试")
    }
  }

  // 处理删除（仅管理员）
  const handleDelete = async (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？此操作不可恢复。")) return

    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (result.success) {
        toast.success("评论已删除")
        loadComments(1)
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
        loadComments(1)
      } else {
        toast.error(result.error || '修改评论失败')
      }
    } catch (error) {
      console.error('修改评论失败:', error)
      toast.error('修改评论失败')
    }
  }

  // 处理撤回
  const handleRecall = async (commentId: string) => {
    if (!confirm("确定要撤回这条评论吗？撤回后其他人将无法看到评论内容。")) return

    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId, action: 'recall' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('评论已撤回')
        loadComments(1)
      } else {
        toast.error(result.error || '撤回失败')
      }
    } catch (error) {
      console.error('撤回失败:', error)
      toast.error('撤回失败')
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
      <div className="flex items-center gap-2.5 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/15">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          评论区 <span className="text-muted-foreground/40 font-normal text-base ml-1">({totalComments > 0 ? `${totalComments} 条评论` : `${totalCount(comments)} 条评论`})</span>
        </h2>
      </div>

      {/* 有隐藏评论时显示提示 */}
      {hasHiddenComments && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-200">
          <p>部分评论因已达到回复深度上限而未显示。如需查看完整评论树，请联系管理员调整评论深度设置。</p>
        </div>
      )}

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
        <>
          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                depth={0}
                onLike={handleLike}
                onReply={handleReply}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onRecall={handleRecall}
                currentUserId={user?.id}
                isAdmin={user?.isAdmin}
                maxDepth={maxDepth}
              />
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
                    加载更多评论
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
