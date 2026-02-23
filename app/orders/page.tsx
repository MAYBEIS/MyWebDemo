'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ShoppingBag, Eye, Copy, Check, QrCode, RefreshCw, X, Clock, CreditCard, Wallet } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// 订单超时时间（30分钟）
const ORDER_TIMEOUT_MS = 30 * 60 * 1000

// 计算剩余时间的函数
function getRemainingTime(createdAt: string): { remaining: number; formatted: string } {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  const elapsed = now - created
  const remaining = Math.max(0, ORDER_TIMEOUT_MS - elapsed)
  
  if (remaining <= 0) {
    return { remaining: 0, formatted: '已超时' }
  }
  
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  
  return {
    remaining,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}

// 订单类型定义
interface Order {
  id: string
  orderNo: string
  productId: string
  productKey: string | null
  amount: number
  status: string
  paymentMethod: string | null
  paymentTime: string | null
  remark: string | null
  createdAt: string
  products: {
    id: string
    name: string
    type: string
    image: string | null
    description?: string
    price?: number
  }
  product_keys?: {
    id: string
    key: string
    status: string
    expiresAt: string | null
  }[]
}

// 订单状态
const orderStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待支付', variant: 'outline' },
  paid: { label: '已支付', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  cancelled: { label: '已取消', variant: 'destructive' },
  refunded: { label: '已退款', variant: 'secondary' }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  
  // 微信支付相关状态
  const [payQrDialogOpen, setPayQrDialogOpen] = useState(false)
  const [payQrCodeUrl, setPayQrCodeUrl] = useState<string | null>(null)
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  
  // 支付方式选择状态
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [availableChannels, setAvailableChannels] = useState<{code: string, name: string, config?: Record<string, string>}[]>([])
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // 倒计时状态
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    fetchOrders()
    fetchAvailableChannels()
  }, [isLoggedIn, router])

  // 获取可用的支付渠道
  const fetchAvailableChannels = async () => {
    try {
      const response = await fetch('/api/shop/payment-channels')
      const data = await response.json()
      if (data.success) {
        const channels = data.data
          .filter((ch: any) => ch.enabled)
          .map((ch: any) => ({
            code: ch.code,
            name: ch.name,
            config: typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config
          }))
        setAvailableChannels(channels)
      }
    } catch (error) {
      console.error('获取支付渠道失败:', error)
    }
  }

  // 处理从商店页面跳转过来的支付请求
  useEffect(() => {
    const payOrderId = searchParams.get('pay')
    const codeUrl = searchParams.get('codeUrl')
    
    if (payOrderId && codeUrl) {
      // 查找对应的订单
      const order = orders.find(o => o.id === payOrderId)
      if (order && order.status === 'pending') {
        setPayingOrder(order)
        setPayQrCodeUrl(decodeURIComponent(codeUrl))
        setPayQrDialogOpen(true)
        // 清除URL参数
        router.replace('/orders')
      }
    }
  }, [orders, searchParams, router])

  // 轮询检查支付状态
  useEffect(() => {
    if (!payQrDialogOpen || !payingOrder) return

    const checkPayment = async () => {
      setCheckingPayment(true)
      try {
        const response = await fetch(`/api/shop/wechat-pay?orderNo=${payingOrder.orderNo}`)
        const data = await response.json()
        
        if (data.success && data.data.tradeState === 'SUCCESS') {
          toast.success('支付成功！')
          setPayQrDialogOpen(false)
          fetchOrders() // 刷新订单列表
        }
      } catch (error) {
        console.error('检查支付状态失败:', error)
      } finally {
        setCheckingPayment(false)
      }
    }

    // 每3秒检查一次支付状态
    const interval = setInterval(checkPayment, 3000)
    
    // 立即检查一次
    checkPayment()

    return () => clearInterval(interval)
  }, [payQrDialogOpen, payingOrder])

  // 更新待支付订单的倒计时
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {}
      let hasExpiredOrder = false
      
      orders.forEach(order => {
        if (order.status === 'pending') {
          const { remaining, formatted } = getRemainingTime(order.createdAt)
          newCountdowns[order.id] = formatted
          
          // 如果订单刚超时，刷新列表
          if (remaining === 0) {
            hasExpiredOrder = true
          }
        }
      })
      
      setCountdowns(newCountdowns)
      
      // 如果有订单超时，刷新列表
      if (hasExpiredOrder) {
        fetchOrders()
      }
    }
    
    // 立即更新一次
    updateCountdowns()
    
    // 每秒更新倒计时
    const interval = setInterval(updateCountdowns, 1000)
    
    return () => clearInterval(interval)
  }, [orders])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/shop/orders')
      const data = await response.json()
      if (data.success) {
        setOrders(data.data)
      }
    } catch (error) {
      console.error('获取订单列表失败:', error)
      toast.error('获取订单列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 查看订单详情
  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  // 发起微信支付
  const handleWechatPay = async (order: Order) => {
    setPayingOrder(order)
    try {
      const response = await fetch('/api/shop/wechat-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          tradeType: 'NATIVE'
        })
      })

      const data = await response.json()
      if (data.success && data.data.codeUrl) {
        setPayQrCodeUrl(data.data.codeUrl)
        setPayQrDialogOpen(true)
      } else {
        toast.error(data.error || '创建支付订单失败')
      }
    } catch (error) {
      console.error('发起微信支付失败:', error)
      toast.error('发起支付失败')
    }
  }

  // 打开支付方式选择对话框
  const handleOpenPaymentMethod = (order: Order) => {
    setPayingOrder(order)
    // 默认选择第一个可用渠道
    if (availableChannels.length > 0) {
      setSelectedPaymentMethod(availableChannels[0].code)
    }
    setPaymentMethodDialogOpen(true)
  }

  // 发起易支付
  const handleEpay = async (order: Order, payType: 'alipay' | 'wxpay' | 'qqpay') => {
    setProcessingPayment(true)
    try {
      const response = await fetch('/api/shop/epay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          payType: payType
        })
      })

      const data = await response.json()
      if (data.success && data.data.payUrl) {
        // 测试模式下显示二维码对话框
        if (data.data.testMode) {
          setPayQrCodeUrl(data.data.payUrl)
          setPayQrDialogOpen(true)
        } else {
          // 正式模式跳转到支付页面
          window.open(data.data.payUrl, '_blank')
          toast.success('已打开支付页面，请完成支付')
          // 开始轮询检查支付状态
          setPayQrCodeUrl(null)
          setPayQrDialogOpen(true)
        }
      } else {
        toast.error(data.error || '创建支付订单失败')
      }
    } catch (error) {
      console.error('发起易支付失败:', error)
      toast.error('发起支付失败')
    } finally {
      setProcessingPayment(false)
    }
  }

  // 确认支付方式并支付
  const handleConfirmPayment = async () => {
    if (!payingOrder || !selectedPaymentMethod) return

    setPaymentMethodDialogOpen(false)
    
    // 根据选择的支付方式调用不同的支付接口
    if (selectedPaymentMethod === 'wechat') {
      await handleWechatPay(payingOrder)
    } else if (selectedPaymentMethod === 'epay_alipay') {
      await handleEpay(payingOrder, 'alipay')
    } else if (selectedPaymentMethod === 'epay_wxpay') {
      await handleEpay(payingOrder, 'wxpay')
    } else if (selectedPaymentMethod === 'epay_qqpay') {
      await handleEpay(payingOrder, 'qqpay')
    } else if (selectedPaymentMethod === 'epay') {
      // 如果选择的是易支付，让用户再选择具体支付方式
      // 这里默认使用支付宝
      await handleEpay(payingOrder, 'alipay')
    }
  }

  // 手动刷新支付状态
  const handleRefreshPayment = async () => {
    if (!payingOrder) return
    
    setCheckingPayment(true)
    try {
      const response = await fetch(`/api/shop/wechat-pay?orderNo=${payingOrder.orderNo}`)
      const data = await response.json()
      
      if (data.success && data.data.tradeState === 'SUCCESS') {
        toast.success('支付成功！')
        setPayQrDialogOpen(false)
        fetchOrders()
      } else {
        toast.info('暂未检测到支付，请完成扫码支付后重试')
      }
    } catch (error) {
      console.error('检查支付状态失败:', error)
      toast.error('检查支付状态失败')
    } finally {
      setCheckingPayment(false)
    }
  }

  // 复制密钥
  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      toast.success('已复制到剪贴板')
    } catch {
      toast.error('复制失败')
    }
  }

  // 取消订单
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('确定要取消这个订单吗？')) return
    
    try {
      const response = await fetch(`/api/shop/orders?id=${orderId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('订单已取消')
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          setDetailDialogOpen(false)
        }
      } else {
        toast.error(data.error || '取消订单失败')
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      toast.error('取消订单失败')
    }
  }

  // 格式化价格
  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '¥0.00'
    return `¥${price.toFixed(2)}`
  }

  // 获取状态显示
  const getStatusBadge = (status: string) => {
    const config = orderStatusMap[status] || { label: status, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 格式化日期时间
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 pt-24 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-8 w-8" />
          我的订单
        </h1>
        <p className="text-muted-foreground">查看您的购买历史</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">暂无订单记录</p>
            <Button onClick={() => router.push('/shop')}>去购物</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-mono text-sm text-muted-foreground">
                        {order.orderNo}
                      </div>
                      <div className="font-medium mt-1">{order.products?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </div>
                      {/* 待支付订单显示倒计时 */}
                      {order.status === 'pending' && countdowns[order.id] && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm">
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                          <span className={`font-mono ${
                            countdowns[order.id] === '已超时' 
                              ? 'text-destructive' 
                              : parseInt(countdowns[order.id].split(':')[0]) < 5 
                                ? 'text-orange-500' 
                                : 'text-muted-foreground'
                          }`}>
                            剩余时间: {countdowns[order.id]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatPrice(order.amount)}</div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex gap-2">
                      {/* 待支付订单显示支付和取消按钮 */}
                      {order.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaymentMethod(order)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            立即支付
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4 mr-1" />
                            取消
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        详情
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 显示密钥（订单已支付且有密钥） */}
                {(order.status === 'paid' || order.status === 'completed') && (order.productKey || (order.product_keys && order.product_keys.length > 0)) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">产品密钥</div>
                    {/* 显示订单直接存储的密钥 */}
                    {order.productKey && (
                      <div className="flex items-center gap-2 mb-2">
                        <code className="bg-muted px-3 py-1.5 rounded font-mono text-sm flex-1 break-all">
                          {order.productKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(order.productKey!)}
                        >
                          {copiedKey === order.productKey ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    {/* 显示关联表的密钥 */}
                    {order.product_keys && order.product_keys.length > 0 && (
                      <div className="space-y-2">
                        {order.product_keys.map((key) => (
                          <div key={key.id} className="flex items-center gap-2">
                            <code className="bg-muted px-3 py-1.5 rounded font-mono text-sm flex-1 break-all">
                              {key.key}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(key.key)}
                            >
                              {copiedKey === key.key ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 订单详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
            <DialogDescription>
              订单号: {selectedOrder?.orderNo}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-4">
              {/* 产品信息 */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="font-medium text-lg mb-1">{selectedOrder.products?.name}</div>
                {selectedOrder.products?.description && (
                  <div className="text-sm text-muted-foreground">{selectedOrder.products.description}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">订单金额</div>
                  <div className="font-medium text-lg text-primary">{formatPrice(selectedOrder.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">订单状态</div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">支付方式</div>
                  <div className="font-medium">
                    {selectedOrder.paymentMethod === 'wechat' ? '微信支付' : 
                     selectedOrder.paymentMethod === 'epay_alipay' ? '支付宝（易支付）' :
                     selectedOrder.paymentMethod === 'epay_wxpay' ? '微信支付（易支付）' :
                     selectedOrder.paymentMethod === 'epay_qqpay' ? 'QQ钱包（易支付）' :
                     selectedOrder.paymentMethod === 'manual' ? '人工处理' :
                     selectedOrder.paymentMethod || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">产品类型</div>
                  <div className="font-medium">
                    {selectedOrder.products?.type === 'membership' ? '会员' :
                     selectedOrder.products?.type === 'serial_key' ? '序列号' :
                     selectedOrder.products?.type === 'digital' ? '数字产品' :
                     selectedOrder.products?.type || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">创建时间</div>
                  <div className="font-medium">{formatDateTime(selectedOrder.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">支付时间</div>
                  <div className="font-medium">{formatDateTime(selectedOrder.paymentTime)}</div>
                </div>
              </div>

              {/* 显示订单中的密钥（直接存储在订单上的） */}
              {selectedOrder.productKey && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">产品密钥</div>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-2 rounded font-mono text-sm flex-1 break-all">
                      {selectedOrder.productKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedOrder.productKey!)}
                    >
                      {copiedKey === selectedOrder.productKey ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* 显示关联的密钥（从 product_keys 表关联的） */}
              {selectedOrder.product_keys && selectedOrder.product_keys.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">产品密钥</div>
                  <div className="space-y-2">
                    {selectedOrder.product_keys.map((key) => (
                      <div key={key.id} className="flex items-center gap-2">
                        <code className="bg-muted px-3 py-2 rounded font-mono text-sm flex-1 break-all">
                          {key.key}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(key.key)}
                        >
                          {copiedKey === key.key ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 显示备注信息 */}
              {selectedOrder.remark && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">备注</div>
                  <div className="text-sm bg-muted/30 px-3 py-2 rounded">
                    {selectedOrder.remark}
                  </div>
                </div>
              )}

              {/* 待支付订单显示支付按钮 */}
              {selectedOrder.status === 'pending' && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setDetailDialogOpen(false)
                      handleOpenPaymentMethod(selectedOrder)
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    立即支付
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 微信支付二维码对话框 */}
      <Dialog open={payQrDialogOpen} onOpenChange={setPayQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>扫码支付</DialogTitle>
            <DialogDescription>
              请扫描下方二维码完成支付
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-4">
            {/* 二维码显示区域 */}
            <div className="bg-white p-4 rounded-lg border mb-4">
              {payQrCodeUrl ? (
                // 使用第三方二维码生成服务
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payQrCodeUrl)}`}
                  alt="支付二维码"
                  className="w-[200px] h-[200px]"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* 订单信息 */}
            {payingOrder && (
              <div className="text-center mb-4 w-full">
                <div className="text-sm text-muted-foreground mb-1">
                  {payingOrder.products?.name}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(payingOrder.amount)}
                </div>
              </div>
            )}

            {/* 支付状态提示 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              {checkingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在检查支付状态...</span>
                </>
              ) : (
                <>
                  <span>等待支付中...</span>
                </>
              )}
            </div>

            {/* 手动刷新按钮 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRefreshPayment}
              disabled={checkingPayment}
            >
              {checkingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              我已支付，刷新状态
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 支付方式选择对话框 */}
      <Dialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>选择支付方式</DialogTitle>
            <DialogDescription>
              请选择您要使用的支付方式
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* 订单金额显示 */}
            {payingOrder && (
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">支付金额</div>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(payingOrder.amount)}
                </div>
              </div>
            )}

            {/* 支付方式列表 */}
            <div className="space-y-2">
              {availableChannels.map((channel) => {
                // 根据渠道类型显示不同的选项
                if (channel.code === 'wechat') {
                  return (
                    <div
                      key={channel.code}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPaymentMethod === channel.code 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod(channel.code)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <QrCode className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium">微信支付</div>
                          <div className="text-xs text-muted-foreground">使用微信扫码支付</div>
                        </div>
                      </div>
                    </div>
                  )
                } else if (channel.code === 'epay') {
                  // 易支付根据配置显示启用的支付方式
                  const enabledTypes = channel.config?.enabledPaymentTypes 
                    ? channel.config.enabledPaymentTypes.split(',').filter((t: string) => t)
                    : ['alipay', 'wxpay'] // 默认显示支付宝和微信
                  
                  return (
                    <div key={channel.code} className="space-y-2">
                      {enabledTypes.includes('alipay') && (
                        <div
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPaymentMethod === 'epay_alipay' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedPaymentMethod('epay_alipay')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <Wallet className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-medium">支付宝（易支付）</div>
                              <div className="text-xs text-muted-foreground">使用支付宝扫码支付</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {enabledTypes.includes('wxpay') && (
                        <div
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPaymentMethod === 'epay_wxpay' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedPaymentMethod('epay_wxpay')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                              <QrCode className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <div className="font-medium">微信支付（易支付）</div>
                              <div className="text-xs text-muted-foreground">使用微信扫码支付</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {enabledTypes.includes('qqpay') && (
                        <div
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPaymentMethod === 'epay_qqpay' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedPaymentMethod('epay_qqpay')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                              <Wallet className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                              <div className="font-medium">QQ钱包（易支付）</div>
                              <div className="text-xs text-muted-foreground">使用QQ钱包扫码支付</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                } else if (channel.code === 'alipay') {
                  return (
                    <div
                      key={channel.code}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPaymentMethod === channel.code 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod(channel.code)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Wallet className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">支付宝</div>
                          <div className="text-xs text-muted-foreground">使用支付宝扫码支付</div>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>

            {/* 确认按钮 */}
            <Button 
              className="w-full"
              onClick={handleConfirmPayment}
              disabled={!selectedPaymentMethod || processingPayment}
            >
              {processingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              确认支付
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
