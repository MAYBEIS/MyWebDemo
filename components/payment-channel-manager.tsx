'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CreditCard, Settings, Check, AlertCircle, Eye, EyeOff, Save } from 'lucide-react'
import { toast } from 'sonner'

// 支付渠道配置类型
interface PaymentChannel {
  id: string
  name: string
  code: string
  enabled: boolean
  config: Record<string, string>
  description: string
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
  ]
}

// 支付渠道名称映射
const channelNames: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝'
}

export function PaymentChannelManager() {
  const [channels, setChannels] = useState<PaymentChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null)
  const [editedConfig, setEditedConfig] = useState<Record<string, string>>({})
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchChannels()
  }, [])

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
    setEditedConfig({ ...channel.config })
    setConfigDialogOpen(true)
  }

  // 保存配置
  const handleSaveConfig = async () => {
    if (!selectedChannel) return

    setSaving(true)
    try {
      const response = await fetch('/api/shop/payment-channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedChannel.code,
          config: editedConfig
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

  // 切换显示/隐藏密钥
  const toggleShowSecret = (fieldLabel: string) => {
    setShowSecret(prev => ({
      ...prev,
      [fieldLabel]: !prev[fieldLabel]
    }))
  }

  // 获取配置字段值
  const getConfigValue = (channel: PaymentChannel, fieldLabel: string): string => {
    // 将中文标签映射到配置键
    const keyMap: Record<string, string> = {
      '公众号AppID': 'appId',
      '商户号': 'mchId',
      'API密钥': 'apiKey',
      'API V3密钥': 'apiV3Key',
      '证书序列号': 'serialNo',
      '回调通知地址': 'notifyUrl',
      '应用ID': 'appId',
      '应用私钥': 'privateKey',
      '支付宝公钥': 'alipayPublicKey',
    }
    const key = keyMap[fieldLabel] || fieldLabel
    return channel.config[key] || ''
  }

  // 设置配置字段值
  const setConfigValue = (fieldLabel: string, value: string) => {
    const keyMap: Record<string, string> = {
      '公众号AppID': 'appId',
      '商户号': 'mchId',
      'API密钥': 'apiKey',
      'API V3密钥': 'apiV3Key',
      '证书序列号': 'serialNo',
      '回调通知地址': 'notifyUrl',
      '应用ID': 'appId',
      '应用私钥': 'privateKey',
      '支付宝公钥': 'alipayPublicKey',
    }
    const key = keyMap[fieldLabel] || fieldLabel
    setEditedConfig(prev => ({
      ...prev,
      [key]: value
    }))
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
            配置和管理支付渠道，支持微信支付、支付宝等
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
                  <li>微信支付需要申请微信商户平台账号并完成企业认证</li>
                  <li>API密钥可在微信商户平台 - 账户中心 - API安全中设置</li>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              配置 {selectedChannel && (channelNames[selectedChannel.code] || selectedChannel.name)}
            </DialogTitle>
            <DialogDescription>
              请填写支付渠道的配置信息
            </DialogDescription>
          </DialogHeader>

          {selectedChannel && (
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
                    value={editedConfig[field.label] || getConfigValue(selectedChannel, field.label)}
                    onChange={(e) => setConfigValue(field.label, e.target.value)}
                    placeholder={field.placeholder}
                    className="bg-background/30"
                  />
                </div>
              ))}
            </div>
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