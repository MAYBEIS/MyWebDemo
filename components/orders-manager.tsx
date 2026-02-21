'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, ShoppingCart, Eye, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'

// 订单类型定义
interface Order {
  id: string
  orderNo: string
  userId: string
  productId: string
  productKey: string | null
  amount: number
  status: string
  paymentMethod: string | null
  paymentTime: string | null
  remark: string | null
  createdAt: string
  users: {
    id: string
    name: string
    email: string
  }
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

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)

  // 筛选状态
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 获取订单列表
  useEffect(() => {
    fetchOrders()
  }, [filterStatus])

  const fetchOrders = async () => {
    try {
      let url = '/api/shop/orders?admin=true'
      if (filterStatus && filterStatus !== 'all') url += `&status=${filterStatus}`

      const response = await fetch(url)
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

  // 更新订单状态
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const response = await fetch('/api/shop/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('订单状态已更新')
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus })
        }
      } else {
        toast.error(data.error || '更新失败')
      }
    } catch (error) {
      console.error('更新订单状态失败:', error)
      toast.error('更新订单状态失败')
    } finally {
      setUpdating(false)
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                订单管理
              </CardTitle>
              <CardDescription>查看和管理用户订单</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(orderStatusMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无订单
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>产品</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.orderNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.users?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{order.users?.email || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div>
                         <div className="font-medium">{order.products?.name || '-'}</div>
                       </div>
                     </TableCell>
                    <TableCell>{formatPrice(order.amount)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'paid')}
                              title="标记为已支付"
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              title="取消订单"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {order.status === 'paid' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                            title="完成订单"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                  <div className="text-sm text-muted-foreground">用户</div>
                  <div className="font-medium">{selectedOrder.users?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedOrder.users?.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">产品</div>
                  <div className="font-medium">{selectedOrder.products?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">订单金额</div>
                  <div className="font-medium text-lg">{formatPrice(selectedOrder.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">状态</div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">支付方式</div>
                  <div className="font-medium">{selectedOrder.paymentMethod || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">创建时间</div>
                  <div className="font-medium">{formatDateTime(selectedOrder.createdAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">支付时间</div>
                  <div className="font-medium">{formatDateTime(selectedOrder.paymentTime)}</div>
                </div>
              </div>

              {selectedOrder.remark && (
                <div>
                  <div className="text-sm text-muted-foreground">备注</div>
                  <div className="font-medium">{selectedOrder.remark}</div>
                </div>
              )}

              {/* 显示关联的密钥 */}
              {selectedOrder.product_keys && selectedOrder.product_keys.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">关联密钥</div>
                  <div className="space-y-2">
                    {selectedOrder.product_keys.map((key) => (
                      <div key={key.id} className="bg-muted px-3 py-2 rounded font-mono text-sm">
                        {key.key}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            {selectedOrder && selectedOrder.status === 'pending' && (
              <Button 
                onClick={() => {
                  handleUpdateStatus(selectedOrder.id, 'paid')
                }}
                disabled={updating}
              >
                {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                确认支付
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
