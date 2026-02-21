"use client"

import { useState } from "react"
import { Settings, Save, RotateCcw, Image, MessageSquare, Users, Check, AlertCircle, Globe, Search, Shield, Link, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface SettingsManagerProps {
  initialSettings: Record<string, { value: string; description: string }>
}

export function SettingsManager({ initialSettings }: SettingsManagerProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 更新设置
  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }))
  }

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true)
    try {
      for (const [key, config] of Object.entries(settings)) {
        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key, value: config.value }),
        })

        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.error || `保存失败: ${response.statusText}`)
        }
      }
      toast.success('设置已保存')
    } catch (error) {
      console.error('保存设置失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 重置为默认值
  const handleReset = () => {
    if (confirm('确定要重置所有设置为默认值吗？')) {
      setSettings({
        comment_max_depth: { value: '3', description: '评论最大回复深度 (1-5)' },
        image_host_provider: { value: 'local', description: '图床类型 (local/smms/imgbb/github)' },
        allow_registration: { value: 'true', description: '是否允许用户注册' },
        moderation_enabled: { value: 'false', description: '是否启用评论审核' },
      })
      toast.info('设置已重置，请点击保存按钮确认')
    }
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            系统设置
          </h1>
          <p className="text-sm text-muted-foreground/60 mt-1">
            配置网站的各项功能设置
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2 border-border/40"
          >
            <RotateCcw className="h-4 w-4" />
            重置
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>

      {/* 博客基本设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          博客基本设置
        </h2>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="site_title">网站标题</Label>
            <Input
              id="site_title"
              value={settings.site_title?.value || ''}
              onChange={(e) => updateSetting('site_title', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="SysLog"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.site_title?.description || '网站标题'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="site_description">网站描述</Label>
            <Textarea
              id="site_description"
              value={settings.site_description?.value || ''}
              onChange={(e) => updateSetting('site_description', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md min-h-[80px]"
              placeholder="一个现代化的技术博客"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.site_description?.description || '网站描述'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="site_keywords">网站关键字</Label>
            <Input
              id="site_keywords"
              value={settings.site_keywords?.value || ''}
              onChange={(e) => updateSetting('site_keywords', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="博客,技术,编程"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.site_keywords?.description || '网站关键字（用逗号分隔）'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="site_logo">网站 Logo</Label>
            <Input
              id="site_logo"
              value={settings.site_logo?.value || ''}
              onChange={(e) => updateSetting('site_logo', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.site_logo?.description || '网站 Logo URL'}
            </p>
          </div>
        </div>
      </div>

      {/* 社交链接设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Link className="h-5 w-5 text-primary" />
          社交链接
        </h2>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="github_url">GitHub</Label>
            <Input
              id="github_url"
              type="url"
              value={settings.github_url?.value || ''}
              onChange={(e) => updateSetting('github_url', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="https://github.com/username"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.github_url?.description || 'GitHub 个人主页链接'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="twitter_url">Twitter / X</Label>
            <Input
              id="twitter_url"
              type="url"
              value={settings.twitter_url?.value || ''}
              onChange={(e) => updateSetting('twitter_url', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="https://twitter.com/username"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.twitter_url?.description || 'Twitter/X 链接'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="weibo_url">微博</Label>
            <Input
              id="weibo_url"
              type="url"
              value={settings.weibo_url?.value || ''}
              onChange={(e) => updateSetting('weibo_url', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="https://weibo.com/username"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.weibo_url?.description || '微博链接'}
            </p>
          </div>
        </div>
      </div>

      {/* 评论设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          评论设置
        </h2>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="comment_max_depth">评论最大回复深度</Label>
            <Input
              id="comment_max_depth"
              type="number"
              min={1}
              max={5}
              value={settings.comment_max_depth?.value || '3'}
              onChange={(e) => updateSetting('comment_max_depth', e.target.value)}
              className="bg-background/30 border-border/40 max-w-xs"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.comment_max_depth?.description || '评论最大回复深度 (1-5)'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="comment_filter_words">敏感词过滤</Label>
            <Textarea
              id="comment_filter_words"
              value={settings.comment_filter_words?.value || ''}
              onChange={(e) => updateSetting('comment_filter_words', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md min-h-[80px]"
              placeholder="敏感词1,敏感词2,敏感词3"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.comment_filter_words?.description || '敏感词过滤（用逗号分隔）'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="moderation_enabled">评论审核</Label>
              <p className="text-xs text-muted-foreground/50 mt-1">
                {settings.moderation_enabled?.description || '是否启用评论审核'}
              </p>
            </div>
            <Switch
              id="moderation_enabled"
              checked={settings.moderation_enabled?.value === 'true'}
              onCheckedChange={(checked) => updateSetting('moderation_enabled', checked ? 'true' : 'false')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="comment_captcha_enabled">评论验证码</Label>
              <p className="text-xs text-muted-foreground/50 mt-1">
                {settings.comment_captcha_enabled?.description || '是否启用评论验证码'}
              </p>
            </div>
            <Switch
              id="comment_captcha_enabled"
              checked={settings.comment_captcha_enabled?.value === 'true'}
              onCheckedChange={(checked) => updateSetting('comment_captcha_enabled', checked ? 'true' : 'false')}
            />
          </div>
        </div>
      </div>

      {/* 分页设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          分页设置
        </h2>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="posts_per_page">每页文章数量</Label>
            <Input
              id="posts_per_page"
              type="number"
              min={1}
              max={50}
              value={settings.posts_per_page?.value || '10'}
              onChange={(e) => updateSetting('posts_per_page', e.target.value)}
              className="bg-background/30 border-border/40 max-w-xs"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.posts_per_page?.description || '每页显示文章数量'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="comments_per_page">每页评论数量</Label>
            <Input
              id="comments_per_page"
              type="number"
              min={1}
              max={100}
              value={settings.comments_per_page?.value || '20'}
              onChange={(e) => updateSetting('comments_per_page', e.target.value)}
              className="bg-background/30 border-border/40 max-w-xs"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.comments_per_page?.description || '每页显示评论数量'}
            </p>
          </div>
        </div>
      </div>

      {/* 用户设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          用户设置
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="allow_registration">允许用户注册</Label>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {settings.allow_registration?.description || '是否允许新用户注册'}
            </p>
          </div>
          <Switch
            id="allow_registration"
            checked={settings.allow_registration?.value === 'true'}
            onCheckedChange={(checked) => updateSetting('allow_registration', checked ? 'true' : 'false')}
          />
        </div>
      </div>

      {/* 图床设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Image className="h-5 w-5 text-primary" />
          图床设置
        </h2>
        
        <div className="grid gap-2">
          <Label htmlFor="image_host_provider">图床类型</Label>
          <select
            id="image_host_provider"
            value={settings.image_host_provider?.value || 'local'}
            onChange={(e) => updateSetting('image_host_provider', e.target.value)}
            className="bg-background/30 border border-border/40 rounded-lg px-3 py-2 text-sm max-w-xs"
          >
            <option value="local">本地存储 (local)</option>
            <option value="smms">SM.MS (smms)</option>
            <option value="imgbb">ImgBB (imgbb)</option>
            <option value="github">GitHub (github)</option>
          </select>
          <p className="text-xs text-muted-foreground/50">
            {settings.image_host_provider?.description || '选择图片存储方式'}
          </p>
        </div>

        {/* 图床配置提示 */}
        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">图床配置说明</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>本地存储</strong>：图片保存在服务器本地 public/uploads 目录</li>
                <li><strong>SM.MS</strong>：需要配置 SMMS_API_TOKEN</li>
                <li><strong>ImgBB</strong>：需要配置 IMGBB_API_KEY</li>
                <li><strong>GitHub</strong>：需要配置 GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
