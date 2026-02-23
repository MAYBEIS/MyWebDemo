'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CreditCard, Settings, AlertCircle, Eye, EyeOff, Save, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

// 支付渠道配置类型
interface PaymentChannel {
  id: string
  name: string
  code: string
  enabled: boolean
  config: Record<string, string> | string
  description: string | null
}

// 支付渠道配置字段定义
const channelConfigFields: Record<string, { label: string; type: string; placeholder: string; required: boolean }[]> = {
  wechat: [
    { label: '公众号AppID', type: 'text', placeholder: 'wx1234567890abcdef', required: true },
    { label: '商户号', type: 'text', placeholder: '1234567890', required: true },
    { label: 'API密钥', type: 'password', placeholder: '32位API密钥', required: true },
    { label: 'API V3密钥', type: 'password', placeholder: '32位API V3密钥（可选）', required: false },
    { label: '证书序列号', type: 'text', placeholder: '证书序列号（可选）', required: false },
    { label: '回调通知地址', type: 'text', placeholder: 'https://your-domain.com/api/shop/wechat-pay/notify', required: true },
  ],
  alipay: [
    { label: '应用ID', type: 'text', placeholder: '2021000000000000', required: true },
    { label: '应用私钥', type: 'password', placeholder: '应用私钥内容', required: true },
    { label: '支付宝公钥', type: 'password', placeholder: '支付宝公钥内容', required: true },
    { label: '回调通知地址', type: 'text', placeholder: 'https://your-domain.com/api/shop/alipay/notify', required: true },
  ],
  xunhupay: [
    { label: 'AppID', type: 'text', placeholder: '虎皮椒AppID', required: true },
    { label: 'AppSecret', type: 'password', placeholder: '虎皮椒密钥', required: true },
    { label: '异步通知地址', type: 'text', placeholder: 'https://your-domain.com/api/shop/xunhupay/notify', required: false },
  ]
}

// 虎皮椒支持的支付方式
const XUNHUPAY_PAYMENT_TYPES = [
  { code: 'wechat', name: '微信支付', icon: '💚' },
  { code: 'alipay', name: '支付宝', icon: '💳' },
]

// 支付渠道名称映射
const channelNames: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  xunhupay: '虎皮椒支付'
}

interface PaymentChannelManagerProps {
  initialChannels?: PaymentChannel[]
}

export function PaymentChannelManager({ initialChannels }: PaymentChannelManagerProps) {
  const [channels, setChannels] = useState<PaymentChannel[]>(initialChannels || [])
  const [loading, setLoading] = useState(!initialChannels)
  const [saving, setSaving] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null)
  const [editedConfig, setEditedConfig] = useState<Record<string, string>>({})
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  // 虎皮椒特有配置状态
  const [xunhupayPaymentTypes, setXunhupayPaymentTypes] = useState<string[]>(['wechat', 'alipay'])

  useEffect(() => {
    if (!initialChannels) {
      fetchChannels()
    }
  }, [initialChannels])

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/shop/payment-channels')
      const data = await response.json()
      if (data.success) {
        setChannels(data.data)
      }
    } catch (error) {
      console.error('获取支付渠道失败:', error)
      toast.error('获取支付渠道失败')
    } finally {
      setLoading(false)
    }
  }

  // 切换渠道启用状态
  const handleToggleEnabled = async (channel: PaymentChannel) => {
    try {
      const response = await fetch('/api/shop/payment-channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: channel.code,
          enabled: !channel.enabled
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(channel.enabled ? '已禁用支付渠道' : '已启用支付渠道')
        fetchChannels()
      } else {
        toast.error(data.error || '操作失败')
      }
    } catch (error) {
      console.error('切换支付渠道状态失败:', error)
      toast.error('操作失败')
    }
  }

  // 打开配置对话框
  const handleOpenConfig = (channel: PaymentChannel) => {
    setSelectedChannel(channel)
    // 解析config，可能是字符串或对象
    const configObj = typeof channel.config === 'string' 
      ? JSON.parse(channel.config) 
      : channel.config
    setEditedConfig({ ...configObj })
    
    // 加载虎皮椒特有配置
    if (channel.code === 'xunhupay') {
      // 加载启用的支付方式
      const enabledTypes = configObj.enabledPaymentTypes 
        ? configObj.enabledPaymentTypes.split(',').filter((t: string) => t)
        : ['wechat', 'alipay']
      setXunhupayPaymentTypes(enabledTypes)
    }
    
    setConfigDialogOpen(true)
  }

  // 保存配置
  const handleSaveConfig = async () => {
    if (!selectedChannel) return

    setSaving(true)
    try {
      // 构建最终配置
      const finalConfig = { ...editedConfig }
      
      // 如果是虎皮椒，添加特有配置
      if (selectedChannel.code === 'xunhupay') {
        finalConfig.enabledPaymentTypes = xunhupayPaymentTypes.join(',')
      }

      const response = await fetch('/api/shop/payment-channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedChannel.code,
          config: finalConfig
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('配置已保存')
        setConfigDialogOpen(false)
        fetchChannels()
      } else {
        toast.error(data.error || '保存失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 切换虎皮椒支付方式
  const toggleXunhupayPaymentType = (type: string) => {
    setXunhupayPaymentTypes(prev => {
      if (prev.includes(type)) {
        // 至少保留一个支付方式
        if (prev.length <= 1) {
          toast.error('至少需要保留一种支付方式')
          return prev
        }
        return prev.filter(t => t !== type)
      } else {
        return [...prev, type]
      }
    })
  }

  // 切换显示/隐藏密钥
  const toggleShowSecret = (fieldLabel: string) => {
    setShowSecret(prev => ({
      ...prev,
      [fieldLabel]: !prev[fieldLabel]
    }))
  }

  // 将中文标签映射到配置键
  const configKeyMap: Record<string, string> = {
    '公众号AppID': 'appId',
    '商户号': 'mchId',
    'API密钥': 'apiKey',
    'API V3密钥': 'apiV3Key',
    '证书序列号': 'serialNo',
    '回调通知地址': 'notifyUrl',
    '应用ID': 'appId',
    '应用私钥': 'privateKey',
    '支付宝公钥': 'alipayPublicKey',
    'AppID': 'appid',
    'AppSecret': 'appSecret',
    '异步通知地址': 'notifyUrl',
  }

  // 获取配置字段值
  const getConfigValue = (channel: PaymentChannel, fieldLabel: string): string => {
    const key = configKeyMap[fieldLabel] || fieldLabel
    // 解析config，可能是字符串或对象
    const configObj = typeof channel.config === 'string' 
      ? JSON.parse(channel.config) 
      : channel.config
    return configObj[key] || ''
  }

  // 设置配置字段值
  const setConfigValue = (fieldLabel: string, value: string) => {
    const key = configKeyMap[fieldLabel] || fieldLabel
    setEditedConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 获取编辑后的配置值（用于Input显示）
  const getEditedConfigValue = (fieldLabel: string): string => {
    const key = configKeyMap[fieldLabel] || fieldLabel
    return editedConfig[key] ?? ''
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            支付渠道配置
          </CardTitle>
          <CardDescription>
            配置和管理支付渠道，支持微信支付、支付宝、虎皮椒支付等
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无支付渠道
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((channel) => {
                const configFields = channelConfigFields[channel.code] || []
                const hasRequiredConfig = configFields
                  .filter(f => f.required)
                  .every(f => getConfigValue(channel, f.label))

                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-card/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <CreditCard className={`h-5 w-5 ${channel.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{channelNames[channel.code] || channel.name}</span>
                          {channel.enabled ? (
                            <Badge variant="default" className="text-xs">已启用</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">已禁用</Badge>
                          )}
                          {!hasRequiredConfig && channel.enabled && (
                            <Badge variant="destructive" className="text-xs">配置不完整</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{channel.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenConfig(channel)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        配置
                      </Button>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => handleToggleEnabled(channel)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 配置提示 */}
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">配置说明</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>微信支付/支付宝官方接口需要申请商户平台账号并完成企业认证</li>
                  <li>虎皮椒支付是第三方聚合支付平台，支持微信和支付宝，个人开发者友好</li>
                  <li>虎皮椒支付只需配置AppID和AppSecret即可使用</li>
                  <li>回调通知地址必须是外网可访问的HTTPS地址</li>
                  <li>配置信息将加密存储在数据库中，建议定期更换密钥</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 配置对话框 */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className={selectedChannel?.code === 'xunhupay' ? 'max-w-2xl' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>
              配置 {selectedChannel && (channelNames[selectedChannel.code] || selectedChannel.name)}
            </DialogTitle>
            <DialogDescription>
              请填写支付渠道的配置信息
            </DialogDescription>
          </DialogHeader>

          {selectedChannel?.code === 'xunhupay' ? (
            // 虎皮椒专用配置页面
            <div className="space-y-6 py-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">基本配置</TabsTrigger>
                  <TabsTrigger value="payment">支付方式</TabsTrigger>
                  <TabsTrigger value="help">帮助说明</TabsTrigger>
                </TabsList>
                
                {/* 基本配置 */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  {(channelConfigFields.xunhupay || []).map((field) => (
                    <div key={field.label} className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={field.label}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.type === 'password' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => toggleShowSecret(field.label)}
                          >
                            {showSecret[field.label] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                      <Input
                        id={field.label}
                        type={field.type === 'password' && !showSecret[field.label] ? 'password' : 'text'}
                        value={getEditedConfigValue(field.label)}
                        onChange={(e) => setConfigValue(field.label, e.target.value)}
                        placeholder={field.placeholder}
                        className="bg-background/30"
                      />
                    </div>
                  ))}
                </TabsContent>
                
                {/* 支付方式配置 */}
                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">启用的支付方式</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        选择用户在结账时可使用的支付方式
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {XUNHUPAY_PAYMENT_TYPES.map((type) => (
                        <div
                          key={type.code}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                            ${xunhupayPaymentTypes.includes(type.code) 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'}
                          `}
                          onClick={() => toggleXunhupayPaymentType(type.code)}
                        >
                          <Checkbox
                            checked={xunhupayPaymentTypes.includes(type.code)}
                            onCheckedChange={() => toggleXunhupayPaymentType(type.code)}
                          />
                          <span className="text-lg">{type.icon}</span>
                          <span className="font-medium">{type.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                {/* 帮助说明 */}
                <TabsContent value="help" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        什么是虎皮椒支付？
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        虎皮椒支付（XunhuPay）是第三方聚合支付平台，支持微信支付、支付宝等多种支付方式。
                        相比官方支付接口，虎皮椒对个人开发者更友好，无需企业资质即可接入。
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">如何获取配置信息？</h4>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>访问虎皮椒官网 (https://www.xunhupay.com) 并注册账号</li>
                        <li>在商户后台创建应用获取AppID</li>
                        <li>在应用设置中获取AppSecret（密钥）</li>
                        <li>配置异步通知地址，格式为：您的域名/api/shop/xunhupay/notify</li>
                      </ol>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">⚠️ 注意事项</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>异步通知地址必须是外网可访问的HTTPS地址</li>
                        <li>AppSecret请妥善保管，不要泄露给他人</li>
                        <li>建议定期更换密钥以提高安全性</li>
                        <li>请选择信誉良好的支付平台，避免资金风险</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">💡 测试模式</h4>
                      <p className="text-sm text-muted-foreground">
                        在环境变量中设置 <code className="px-1 py-0.5 rounded bg-muted">PAYMENT_TEST_MODE=true</code> 
                        可以启用测试模式，无需真实支付即可测试支付流程。
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // 其他支付渠道配置
            selectedChannel && (
              <div className="space-y-4 py-4">
                {(channelConfigFields[selectedChannel.code] || []).map((field) => (
                  <div key={field.label} className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.label}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === 'password' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => toggleShowSecret(field.label)}
                        >
                          {showSecret[field.label] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                    <Input
                      id={field.label}
                      type={field.type === 'password' && !showSecret[field.label] ? 'password' : 'text'}
                      value={getEditedConfigValue(field.label) || getConfigValue(selectedChannel, field.label)}
                      onChange={(e) => setConfigValue(field.label, e.target.value)}
                      placeholder={field.placeholder}
                      className="bg-background/30"
                    />
                  </div>
                ))}
              </div>
            )
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
