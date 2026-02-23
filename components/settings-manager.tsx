"use client"

import { useState } from "react"
import { Settings, Save, RotateCcw, Image, MessageSquare, Users, Check, AlertCircle, Globe, Search, Shield, Link, Layers, Home, Terminal, Type, LayoutGrid, Store, TrendingUp, CalendarDays, MessageCircle } from "lucide-react"
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

      {/* 主页设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Home className="h-5 w-5 text-primary" />
          主页设置
        </h2>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="hero_badge_text">角色标签文字</Label>
            <Input
              id="hero_badge_text"
              value={settings.hero_badge_text?.value || ''}
              onChange={(e) => updateSetting('hero_badge_text', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="系统程序员 / Systems Programmer"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.hero_badge_text?.description || '主页顶部角色标签文字'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero_title_prefix">大标题前缀</Label>
            <Input
              id="hero_title_prefix"
              value={settings.hero_title_prefix?.value || ''}
              onChange={(e) => updateSetting('hero_title_prefix', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="从零构建"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.hero_title_prefix?.description || '大标题开头文字（打字效果前）'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero_title_suffix">大标题后缀</Label>
            <Input
              id="hero_title_suffix"
              value={settings.hero_title_suffix?.value || ''}
              onChange={(e) => updateSetting('hero_title_suffix', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="深入底层的每一个字节"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.hero_title_suffix?.description || '大标题结尾文字（打字效果后）'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero_typing_texts">打字效果文字列表</Label>
            <Textarea
              id="hero_typing_texts"
              value={settings.hero_typing_texts?.value || ''}
              onChange={(e) => updateSetting('hero_typing_texts', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md min-h-[80px]"
              placeholder="内核模块,内存分配器,网络协议栈,文件系统"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.hero_typing_texts?.description || '打字效果循环显示的文字（用逗号分隔）'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero_description">主页描述</Label>
            <Textarea
              id="hero_description"
              value={settings.hero_description?.value || ''}
              onChange={(e) => updateSetting('hero_description', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md min-h-[80px]"
              placeholder="专注于操作系统内核、编译器设计与高性能计算..."
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.hero_description?.description || '主页描述文字'}
            </p>
          </div>
        </div>
      </div>

      {/* 终端窗口设置 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Terminal className="h-5 w-5 text-primary" />
          终端窗口设置
        </h2>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="terminal_title">终端标题</Label>
            <Input
              id="terminal_title"
              value={settings.terminal_title?.value || ''}
              onChange={(e) => updateSetting('terminal_title', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="zsh ~ /projects"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.terminal_title?.description || '终端窗口标题栏文字'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="terminal_command">终端命令</Label>
            <Input
              id="terminal_command"
              value={settings.terminal_command?.value || ''}
              onChange={(e) => updateSetting('terminal_command', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md"
              placeholder="cat /proc/developer/skills"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.terminal_command?.description || '终端显示的命令'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="terminal_content">终端输出内容</Label>
            <Textarea
              id="terminal_content"
              value={settings.terminal_content?.value || ''}
              onChange={(e) => updateSetting('terminal_content', e.target.value)}
              className="bg-background/30 border-border/40 max-w-md min-h-[100px] font-mono text-sm"
              placeholder="lang:    C, Rust, Go, Python&#10;systems: Linux, RTOS, Embedded&#10;focus:   Kernel, Networking, Perf&#10;editor:  Neovim, VS Code"
            />
            <p className="text-xs text-muted-foreground/50">
              {settings.terminal_content?.description || '终端输出内容（每行一项，使用换行分隔）'}
            </p>
          </div>
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

      {/* 分区功能开关 */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <LayoutGrid className="h-5 w-5 text-primary" />
          分区功能开关
        </h2>
        <p className="text-sm text-muted-foreground/60 mb-4">
          控制网站各分区功能的开启与关闭，关闭后导航菜单中将不显示对应入口
        </p>
        
        <div className="grid gap-5">
          {/* 博客开关 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="section_blog_enabled" className="font-medium">博客</Label>
                <p className="text-xs text-muted-foreground/50">
                  {settings.section_blog_enabled?.description || '博客文章列表与详情页面'}
                </p>
              </div>
            </div>
            <Switch
              id="section_blog_enabled"
              checked={settings.section_blog_enabled?.value !== 'false'}
              onCheckedChange={(checked) => updateSetting('section_blog_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {/* 商店开关 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="section_shop_enabled" className="font-medium">商店</Label>
                <p className="text-xs text-muted-foreground/50">
                  {settings.section_shop_enabled?.description || '商品展示与购买功能'}
                </p>
              </div>
            </div>
            <Switch
              id="section_shop_enabled"
              checked={settings.section_shop_enabled?.value !== 'false'}
              onCheckedChange={(checked) => updateSetting('section_shop_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {/* 热榜开关 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="section_trending_enabled" className="font-medium">热榜</Label>
                <p className="text-xs text-muted-foreground/50">
                  {settings.section_trending_enabled?.description || '热门话题与趋势内容'}
                </p>
              </div>
            </div>
            <Switch
              id="section_trending_enabled"
              checked={settings.section_trending_enabled?.value !== 'false'}
              onCheckedChange={(checked) => updateSetting('section_trending_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {/* 每日挑战开关 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="section_quiz_enabled" className="font-medium">每日挑战</Label>
                <p className="text-xs text-muted-foreground/50">
                  {settings.section_quiz_enabled?.description || '每日问答挑战功能'}
                </p>
              </div>
            </div>
            <Switch
              id="section_quiz_enabled"
              checked={settings.section_quiz_enabled?.value !== 'false'}
              onCheckedChange={(checked) => updateSetting('section_quiz_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {/* 留言板开关 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="section_guestbook_enabled" className="font-medium">留言板</Label>
                <p className="text-xs text-muted-foreground/50">
                  {settings.section_guestbook_enabled?.description || '访客留言互动功能'}
                </p>
              </div>
            </div>
            <Switch
              id="section_guestbook_enabled"
              checked={settings.section_guestbook_enabled?.value !== 'false'}
              onCheckedChange={(checked) => updateSetting('section_guestbook_enabled', checked ? 'true' : 'false')}
            />
          </div>
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
