"use client"

import { useState } from "react"
import { MessageSquare, ThumbsUp, Reply, ChevronDown, ChevronUp, Send } from "lucide-react"
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

interface Comment {
  id: number
  author: string
  avatar: string
  date: string
  content: string
  likes: number
  replies: Comment[]
}

const initialComments: Comment[] = [
  {
    id: 1,
    author: "kernel_hacker",
    avatar: "KH",
    date: "2 天前",
    content: "写得太好了！关于 buddy allocator 的解释是我见过最清晰的。希望能看到关于 SLUB 分配器的后续文章。",
    likes: 12,
    replies: [
      {
        id: 11,
        author: "SysLog",
        avatar: "SL",
        date: "1 天前",
        content: "感谢你的反馈！SLUB 分配器的文章已经在规划中了，敬请期待。",
        likes: 5,
        replies: [],
      },
    ],
  },
  {
    id: 2,
    author: "rust_evangelist",
    avatar: "RE",
    date: "1 天前",
    content: "有趣的文章。你对 Rust 的所有权模型如何帮助在内核层面防止常见内存管理 bug 有什么看法？",
    likes: 8,
    replies: [],
  },
  {
    id: 3,
    author: "network_ninja",
    avatar: "NN",
    date: "5 小时前",
    content: "关于 mmap() 的部分可以再详细讲讲 file-backed 与 anonymous mappings 的区别。总体来说是一篇很扎实的深入分析！",
    likes: 4,
    replies: [],
  },
]

function CommentItem({
  comment,
  depth,
  likedSet,
  onLike,
  onReply,
}: {
  comment: Comment
  depth: number
  likedSet: Set<number>
  onLike: (id: number) => void
  onReply: (parentId: number, content: string) => void
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [showReplies, setShowReplies] = useState(depth < 1)
  const { isLoggedIn } = useAuth()

  const handleReply = () => {
    if (!replyText.trim()) return
    onReply(comment.id, replyText)
    setReplyText("")
    setShowReplyInput(false)
  }

  const isAuthor = comment.author === "SysLog"

  return (
    <div className={`${depth > 0 ? "ml-8 pl-4 border-l border-border/20" : ""}`}>
      <div className="rounded-xl border border-border/30 bg-card/20 p-5 transition-all duration-300 hover:bg-card/40 hover:border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 border border-border/40">
            <AvatarFallback className={`text-xs font-mono ${isAuthor ? "bg-primary/15 text-primary" : "bg-primary/8 text-primary/80"}`}>
              {comment.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium font-mono ${isAuthor ? "text-primary" : "text-foreground/90"}`}>
              {comment.author}
            </span>
            {isAuthor && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                作者
              </span>
            )}
            <span className="text-xs text-muted-foreground/40">{comment.date}</span>
          </div>
        </div>
        <p className="text-sm text-foreground/70 leading-relaxed mb-4 pl-11">
          {comment.content}
        </p>
        <div className="flex items-center gap-4 pl-11">
          <button
            onClick={() => onLike(comment.id)}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
              likedSet.has(comment.id) ? "text-primary" : "text-muted-foreground/40 hover:text-primary"
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${likedSet.has(comment.id) ? "fill-current" : ""}`} />
            {comment.likes}
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
          {comment.replies.length > 0 && (
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

      {showReplies && comment.replies.length > 0 && (
        <div className="flex flex-col gap-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              likedSet={likedSet}
              onLike={onLike}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ArticleComments() {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState("")
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set())
  const { user, isLoggedIn } = useAuth()

  const handleSubmitComment = () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再发表评论")
      return
    }
    if (!newComment.trim()) {
      toast.error("请输入评论内容")
      return
    }
    const comment: Comment = {
      id: Date.now(),
      author: user!.name,
      avatar: getAvatarInitials(user!.name, user!.avatar),
      date: "刚刚",
      content: newComment,
      likes: 0,
      replies: [],
    }
    setComments([...comments, comment])
    setNewComment("")
    toast.success("评论发表成功！")
  }

  const handleLike = (id: number) => {
    if (likedComments.has(id)) {
      setLikedComments((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      const updateLikes = (items: Comment[]): Comment[] =>
        items.map((c) => c.id === id ? { ...c, likes: c.likes - 1, replies: updateLikes(c.replies) } : { ...c, replies: updateLikes(c.replies) })
      setComments(updateLikes(comments))
    } else {
      setLikedComments(new Set([...likedComments, id]))
      const updateLikes = (items: Comment[]): Comment[] =>
        items.map((c) => c.id === id ? { ...c, likes: c.likes + 1, replies: updateLikes(c.replies) } : { ...c, replies: updateLikes(c.replies) })
      setComments(updateLikes(comments))
    }
  }

  const handleReply = (parentId: number, content: string) => {
    if (!user) return
    const reply: Comment = {
      id: Date.now(),
      author: user.name,
      avatar: getAvatarInitials(user.name, user.avatar),
      date: "刚刚",
      content,
      likes: 0,
      replies: [],
    }
    const addReply = (items: Comment[]): Comment[] =>
      items.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, reply] }
          : { ...c, replies: addReply(c.replies) }
      )
    setComments(addReply(comments))
    toast.success("回复成功！")
  }

  const totalCount = (items: Comment[]): number =>
    items.reduce((sum, c) => sum + 1 + totalCount(c.replies), 0)

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
      <div className="flex flex-col gap-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            likedSet={likedComments}
            onLike={handleLike}
            onReply={handleReply}
          />
        ))}
      </div>
    </section>
  )
}
