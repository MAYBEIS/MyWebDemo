'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { ShoppingCart, Crown, Key, Check, Loader2, CreditCard, QrCode, Ticket } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'

// 产品类型定义
interface Product {
  id: string
  name: string
  description: string
  price: number
  type: string
  duration: number | null
  features: string | null
  image: string | null
  stock: number
  availableStock: number
}

// 产品类型图标
const productTypeIcons: Record<string, any> = {
  membership: Crown,
  serial_key: Key,
  digital: ShoppingCart
}

// 产品类型名称
const productTypeNames: Record<string, string> = {
  membership: '会员',
  serial_key: '序列号',
  digital: '数字产品'
}

// 支付方式
const paymentMethods: Record<string, { label: string; icon: any; description: string }> = {
  wechat: { label: '微信支付', icon: QrCode, description: '使用微信扫码支付' },
  manual: { label: '人工处理', icon: CreditCard, description: '联系管理员手动确认' }
}

export default function ShopPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  
  // 支付方式选择相关状态
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('wechat')
  
  // 优惠券相关状态
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    code: string
    name: string
    discountAmount: number
    finalAmount: number
  } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  // 获取产品列表
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/shop/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
      toast.error('获取产品列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 点击购买按钮，打开支付方式选择对话框
  const handlePurchaseClick = (product: Product) => {
    if (!isLoggedIn) {
      toast.error('请先登录')
      router.push('/login')
      return
    }
    setSelectedProduct(product)
    setAppliedCoupon(null)
    setCouponCode('')
    setPaymentDialogOpen(true)
  }

  // 验证并应用优惠券
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedProduct) return
    
    setValidatingCoupon(true)
    try {
      const response = await fetch(`/api/shop/coupons?code=${encodeURIComponent(couponCode.trim())}&amount=${selectedProduct.price}`)
      const data = await response.json()
      
      if (data.success) {
        setAppliedCoupon(data.data)
        toast.success(`优惠券已应用，优惠 ¥${data.data.discountAmount.toFixed(2)}`)
      } else {
        toast.error(data.error || '优惠券无效')
      }
    } catch (error) {
      console.error('验证优惠券失败:', error)
      toast.error('验证优惠券失败')
    } finally {
      setValidatingCoupon(false)
    }
  }

  // 取消优惠券
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    toast.info('已取消优惠券')
  }

  // 确认购买
  const handleConfirmPurchase = async () => {
    if (!selectedProduct) return

    setPaymentDialogOpen(false)
    setPurchasing(selectedProduct.id)
    
    try {
      // 创建订单
      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          paymentMethod: selectedPaymentMethod,
          couponCode: appliedCoupon?.code
        })
      })

      const data = await response.json()
      if (data.success) {
        // 如果选择微信支付，调用微信支付接口
        if (selectedPaymentMethod === 'wechat') {
          const payResponse = await fetch('/api/shop/wechat-pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: data.data.id,
              tradeType: 'NATIVE'
            })
          })

          const payData = await payResponse.json()
          if (payData.success && payData.data.codeUrl) {
            // 跳转到订单页面，显示支付二维码
            router.push(`/orders?pay=${data.data.id}&codeUrl=${encodeURIComponent(payData.data.codeUrl)}`)
          } else {
            toast.error(payData.error || '创建支付订单失败')
            router.push('/orders')
          }
        } else {
          toast.success('订单创建成功，请等待管理员确认')
          router.push('/orders')
        }
      } else {
        toast.error(data.error || '创建订单失败')
      }
    } catch (error) {
      console.error('购买失败:', error)
      toast.error('购买失败，请稍后重试')
    } finally {
      setPurchasing(null)
    }
  }

  // 解析产品特性
  const parseFeatures = (features: string | null): string[] => {
    if (!features) return []
    try {
      return JSON.parse(features)
    } catch {
      return features.split(',').map(f => f.trim())
    }
  }

  // 格式化价格
  const formatPrice = (price: number) => {
    return `¥${price.toFixed(2)}`
  }

  // 获取库存状态
  const getStockStatus = (product: Product) => {
    if (product.stock === -1) return { text: '无限', available: true }
    if (product.availableStock === 0) return { text: '已售罄', available: false }
    return { text: `剩余 ${product.availableStock}`, available: true }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">商店</h1>
        <p className="text-muted-foreground text-lg">
          购买会员和数字产品，解锁更多精彩功能
        </p>
      </div>

      {/* 产品列表 */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无产品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const TypeIcon = productTypeIcons[product.type] || ShoppingCart
            const stockStatus = getStockStatus(product)
            const features = parseFeatures(product.features)

            return (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {productTypeNames[product.type] || product.type}
                    </Badge>
                    {product.duration && (
                      <Badge variant="outline">
                        {product.duration >= 365 ? '年费' : `${product.duration}天`}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  {/* 价格 */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  {/* 产品特性 */}
                  {features.length > 0 && (
                    <ul className="space-y-2">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => handlePurchaseClick(product)}
                    disabled={!stockStatus.available || purchasing === product.id}
                  >
                    {purchasing === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {stockStatus.available ? '立即购买' : '已售罄'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    库存: {stockStatus.text}
                  </span>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* 用户提示 */}
      {!isLoggedIn && (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            请先 <a href="/login" className="text-primary hover:underline">登录</a> 后购买产品
          </p>
        </div>
      )}

      {/* 支付方式选择对话框 */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>选择支付方式</DialogTitle>
            <DialogDescription>
              您正在购买: {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* 价格显示 */}
            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">订单金额</div>
              {appliedCoupon ? (
                <div className="space-y-1">
                  <div className="text-lg line-through text-muted-foreground">
                    {selectedProduct && `¥${selectedProduct.price.toFixed(2)}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      ¥{appliedCoupon.finalAmount.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      -¥{appliedCoupon.discountAmount.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-primary">
                  {selectedProduct && `¥${selectedProduct.price.toFixed(2)}`}
                </div>
              )}
            </div>
            
            {/* 优惠券输入 */}
            <div className="mb-4 p-3 rounded-lg border border-border/60 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">优惠券</span>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{appliedCoupon.name}</div>
                    <div className="text-xs text-muted-foreground">{appliedCoupon.code}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                    取消
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="输入优惠券代码"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || validatingCoupon}
                  >
                    {validatingCoupon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '应用'
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* 支付方式选择 */}
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">选择支付方式</div>
              {Object.entries(paymentMethods).map(([key, method]) => {
                const MethodIcon = method.icon
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPaymentMethod === key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPaymentMethod(key)}
                  >
                    <div className={`p-2 rounded-full ${
                      selectedPaymentMethod === key ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <MethodIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{method.label}</div>
                      <div className="text-xs text-muted-foreground">{method.description}</div>
                    </div>
                    {selectedPaymentMethod === key && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmPurchase} disabled={purchasing === selectedProduct?.id}>
              {purchasing === selectedProduct?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              确认购买
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
