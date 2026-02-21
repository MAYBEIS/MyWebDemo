"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Post {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  category: string | null
  coverImage: string | null
  published: boolean
  views: number
  likes: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
  }
  tags: { tag: string }[]
}

interface PostsManagerProps {
  initialPosts: Post[]
}

export function PostsManager({ initialPosts }: PostsManagerProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category: "",
    coverImage: "",
    published: false,
    tags: "",
  })

  // 过滤文章
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 打开创建对话框
  const openCreateDialog = () => {
    setEditingPost(null)
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category: "",
      coverImage: "",
      published: false,
      tags: "",
    })
    setIsDialogOpen(true)
  }

  // 打开编辑对话框
  const openEditDialog = (post: Post) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      category: post.category || "",
      coverImage: post.coverImage || "",
      published: post.published,
      tags: post.tags?.map(t => t.tag).join(", ") || "",
    })
    setIsDialogOpen(true)
  }

  // 自动生成 slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  // 处理标题变化，自动生成 slug
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : generateSlug(title),
    }))
  }

  // 保存文章
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("请输入文章标题")
      return
    }
    if (!formData.slug.trim()) {
      toast.error("请输入文章 slug")
      return
    }
    if (!formData.content.trim()) {
      toast.error("请输入文章内容")
      return
    }

    setIsLoading(true)

    try {
      const url = editingPost
        ? `/api/posts/${editingPost.slug}`
        : "/api/posts"
      
      const method = editingPost ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          excerpt: formData.excerpt,
          category: formData.category,
          coverImage: formData.coverImage,
          published: formData.published,
          tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "保存失败")
      }

      toast.success(editingPost ? "文章已更新" : "文章已创建")
      setIsDialogOpen(false)
      
      // 刷新文章列表
      await refreshPosts()
    } catch (error) {
      console.error("保存文章失败:", error)
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 删除文章
  const handleDelete = async (post: Post) => {
    if (!confirm(`确定要删除文章 "${post.title}" 吗？此操作不可撤销。`)) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${post.slug}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "删除失败")
      }

      toast.success("文章已删除")
      setPosts(posts.filter(p => p.id !== post.id))
    } catch (error) {
      console.error("删除文章失败:", error)
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }

  // 切换发布状态
  const togglePublished = async (post: Post) => {
    try {
      const response = await fetch(`/api/posts/${post.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published: !post.published }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "操作失败")
      }

      setPosts(posts.map(p =>
        p.id === post.id ? { ...p, published: !p.published } : p
      ))
      toast.success(post.published ? "文章已下架" : "文章已发布")
    } catch (error) {
      console.error("切换发布状态失败:", error)
      toast.error("操作失败")
    }
  }

  // 刷新文章列表
  const refreshPosts = async () => {
    try {
      const response = await fetch("/api/posts", { credentials: "include" })
      const data = await response.json()
      if (data.success) {
        setPosts(data.data)
      }
    } catch (error) {
      console.error("刷新文章列表失败:", error)
    }
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">文章管理</h1>
          <p className="text-sm text-muted-foreground/60 mt-1">
            共 {posts.length} 篇文章，{posts.filter(p => p.published).length} 篇已发布
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPosts}
            className="gap-2 border-border/40"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
          <Button
            onClick={openCreateDialog}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新建文章
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="搜索文章标题或 slug..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card/30 border-border/40"
        />
      </div>

      {/* 文章列表 */}
      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-card/50">
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">标题</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">分类</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">统计</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground/60">创建时间</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground/60">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map((post) => (
              <tr
                key={post.id}
                className="border-b border-border/20 last:border-0 hover:bg-card/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{post.title}</p>
                    <p className="text-xs text-muted-foreground/40 font-mono">{post.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground/60">
                    {post.category || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={post.published ? "default" : "secondary"}
                    className={post.published ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/20 text-muted-foreground"}
                  >
                    {post.published ? "已发布" : "草稿"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
                    <span>浏览 {post.views}</span>
                    <span>点赞 {post.likes}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground/50">
                    {new Date(post.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublished(post)}
                      className="h-8 w-8 p-0"
                      title={post.published ? "下架" : "发布"}
                    >
                      {post.published ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground/60" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(post)}
                      className="h-8 w-8 p-0"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground/60" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post)}
                      className="h-8 w-8 p-0 hover:text-destructive"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground/60" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPosts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground/40">
                  {searchQuery ? "没有找到匹配的文章" : "暂无文章"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "编辑文章" : "新建文章"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="输入文章标题"
                className="bg-background/30 border-border/40"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (URL 路径)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="article-url-slug"
                className="bg-background/30 border-border/40 font-mono"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="content">内容 (Markdown)</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="使用 Markdown 格式编写文章内容..."
                className="bg-background/30 border-border/40 min-h-[200px] font-mono"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="excerpt">摘要</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="文章简短摘要..."
                className="bg-background/30 border-border/40 min-h-[60px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">分类</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Linux 内核"
                  className="bg-background/30 border-border/40"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">标签 (逗号分隔)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Linux, 内核, 内存管理"
                  className="bg-background/30 border-border/40"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="coverImage">封面图片 URL</Label>
              <Input
                id="coverImage"
                value={formData.coverImage}
                onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                placeholder="https://example.com/cover.jpg"
                className="bg-background/30 border-border/40"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
              />
              <Label htmlFor="published">立即发布</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-border/40"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
