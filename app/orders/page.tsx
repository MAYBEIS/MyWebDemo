'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, ShoppingBag, Eye, Copy, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  
  const { isLoggedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    fetchOrders()
  }, [isLoggedIn, router])

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
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatPrice(order.amount)}</div>
                      {getStatusBadge(order.status)}
                    </div>
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

                {/* 显示密钥 */}
                {order.product_keys && order.product_keys.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">产品密钥</div>
                    <div className="space-y-2">
                      {order.product_keys.map((key) => (
                        <div key={key.id} className="flex items-center gap-2">
                          <code className="bg-muted px-3 py-1.5 rounded font-mono text-sm flex-1">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">产品</div>
                  <div className="font-medium">{selectedOrder.products?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">订单金额</div>
                  <div className="font-medium text-lg">{formatPrice(selectedOrder.amount)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">状态</div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">支付方式</div>
                  <div className="font-medium">{selectedOrder.paymentMethod || '-'}</div>
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

              {/* 显示关联的密钥 */}
              {selectedOrder.product_keys && selectedOrder.product_keys.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">产品密钥</div>
                  <div className="space-y-2">
                    {selectedOrder.product_keys.map((key) => (
                      <div key={key.id} className="flex items-center gap-2">
                        <code className="bg-muted px-3 py-2 rounded font-mono text-sm flex-1">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
