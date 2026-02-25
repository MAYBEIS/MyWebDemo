'use client'

import React, { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { ShoppingCart, Crown, Key, Check, Loader2, QrCode, Ticket, Wallet, CreditCard, TestTube } from 'lucide-react'
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

// 支付渠道类型定义
interface PaymentChannel {
  code: string
  name: string
  icon?: string
  config?: Record<string, string>
  supportedPaymentTypes?: Array<{
    code: string
    name: string
    icon: string
  }>
}

export default function ShopPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  
  // 支付渠道相关状态
  const [availableChannels, setAvailableChannels] = useState<PaymentChannel[]>([])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  
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

  // 获取产品列表和支付渠道
  useEffect(() => {
    fetchProducts()
    fetchAvailableChannels()
  }, [])

  // 获取可用的支付渠道（使用公开API，不需要管理员权限）
  const fetchAvailableChannels = async () => {
    try {
      const response = await fetch('/api/shop/payment-channels/public')
      const data = await response.json()
      if (data.success) {
        const channels = data.data.map((ch: any) => ({
          code: ch.code,
          name: ch.name,
          icon: ch.icon,
          config: typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config,
          supportedPaymentTypes: ch.supportedPaymentTypes
        }))
        setAvailableChannels(channels)
        // 默认选择第一个可用渠道
        if (channels.length > 0) {
          const firstChannel = channels[0]
          // 如果渠道支持多种支付方式，默认选择第一种
          if (firstChannel.supportedPaymentTypes && firstChannel.supportedPaymentTypes.length > 0) {
            setSelectedPaymentMethod(`${firstChannel.code}_${firstChannel.supportedPaymentTypes[0].code}`)
          } else {
            setSelectedPaymentMethod(firstChannel.code)
          }
        }
      }
    } catch (error) {
      console.error('获取支付渠道失败:', error)
    }
  }

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
    
    // 检查是否有可用的支付渠道
    if (availableChannels.length === 0) {
      toast.error('暂无可用的支付方式，请联系管理员')
      return
    }
    
    setSelectedProduct(product)
    setAppliedCoupon(null)
    setCouponCode('')
    
    // 重置默认支付方式
    if (availableChannels.length > 0) {
      const firstChannel = availableChannels[0]
      if (firstChannel.supportedPaymentTypes && firstChannel.supportedPaymentTypes.length > 0) {
        setSelectedPaymentMethod(`${firstChannel.code}_${firstChannel.supportedPaymentTypes[0].code}`)
      } else {
        setSelectedPaymentMethod(firstChannel.code)
      }
    }
    
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
    if (!selectedProduct || !selectedPaymentMethod) return

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
        const orderId = data.data.id
        
        // 根据选择的支付方式调用不同的支付接口
        if (selectedPaymentMethod === 'wechat') {
          // 微信支付
          const payResponse = await fetch('/api/shop/wechat-pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: orderId,
              tradeType: 'NATIVE'
            })
          })

          const payData = await payResponse.json()
          if (payData.success && payData.data.codeUrl) {
            router.push(`/orders?pay=${orderId}&codeUrl=${encodeURIComponent(payData.data.codeUrl)}`)
          } else {
            toast.error(payData.error || '创建支付订单失败')
            router.push('/orders')
          }
        } else if (selectedPaymentMethod === 'alipay') {
          // 支付宝支付
          const payResponse = await fetch('/api/shop/alipay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: orderId
            })
          })

          const payData = await payResponse.json()
          if (payData.success && payData.data.payUrl) {
            // 跳转到支付宝支付页面
            window.open(payData.data.payUrl, '_blank')
            toast.success('已打开支付页面，请完成支付')
            router.push('/orders')
          } else {
            toast.error(payData.error || '创建支付订单失败')
            router.push('/orders')
          }
        } else if (selectedPaymentMethod.startsWith('xunhupay_')) {
          // 虎皮椒支付
          const payType = selectedPaymentMethod.split('_')[1] // wechat 或 alipay
          const payResponse = await fetch('/api/shop/xunhupay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: orderId,
              payType: payType
            })
          })

          const payData = await payResponse.json()
          if (payData.success && payData.data.payUrl) {
            if (payData.data.testMode) {
              // 测试模式显示二维码
              router.push(`/orders?pay=${orderId}&codeUrl=${encodeURIComponent(payData.data.payUrl)}`)
            } else {
              // 正式模式跳转到支付页面
              window.open(payData.data.payUrl, '_blank')
              toast.success('已打开支付页面，请完成支付')
              router.push('/orders')
            }
          } else {
            toast.error(payData.error || '创建支付订单失败')
            router.push('/orders')
          }
        } else if (selectedPaymentMethod === 'test') {
          // 测试支付 - 模拟微信支付的流程
          const payResponse = await fetch('/api/shop/test-pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: orderId
            })
          })

          const payData = await payResponse.json()
          if (payData.success && payData.data.codeUrl) {
            // 跳转到订单页面，显示支付二维码（模拟微信支付流程）
            router.push(`/orders?pay=${orderId}&codeUrl=${encodeURIComponent(payData.data.codeUrl)}&testMode=true`)
          } else {
            toast.error(payData.error || '创建支付订单失败')
            router.push('/orders')
          }
        } else {
          // 其他支付方式，直接跳转到订单页面
          toast.success('订单创建成功')
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

  // 获取支付方式的图标组件
  const getPaymentIcon = (methodCode: string) => {
    if (methodCode === 'wechat' || methodCode.endsWith('_wechat')) {
      return QrCode
    } else if (methodCode === 'alipay' || methodCode.endsWith('_alipay')) {
      return Wallet
    } else if (methodCode === 'test') {
      return TestTube
    }
    return CreditCard
  }

  // 获取支付方式的图标颜色类
  const getPaymentIconColorClass = (methodCode: string) => {
    if (methodCode === 'wechat' || methodCode.endsWith('_wechat')) {
      return 'bg-green-500/10 text-green-500'
    } else if (methodCode === 'alipay' || methodCode.endsWith('_alipay')) {
      return 'bg-blue-500/10 text-blue-500'
    } else if (methodCode === 'test') {
      return 'bg-purple-500/10 text-purple-500'
    }
    return 'bg-muted'
  }

  // 渲染支付方式选项
  const renderPaymentOptions = () => {
    const options: JSX.Element[] = []
    
    availableChannels.forEach((channel) => {
      // 如果渠道支持多种支付方式（如虎皮椒）
      if (channel.supportedPaymentTypes && channel.supportedPaymentTypes.length > 0) {
        // 根据配置确定启用的支付类型
        const enabledTypes = channel.config?.enabledPaymentTypes 
          ? channel.config.enabledPaymentTypes.split(',').filter((t: string) => t)
          : channel.supportedPaymentTypes.map(t => t.code)
        
        channel.supportedPaymentTypes.forEach((payType) => {
          if (enabledTypes.includes(payType.code)) {
            const methodCode = `${channel.code}_${payType.code}`
            const IconComponent = payType.code === 'wechat' ? QrCode : Wallet
            const colorClass = payType.code === 'wechat' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
            
            options.push(
              <div
                key={methodCode}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPaymentMethod === methodCode
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPaymentMethod(methodCode)}
              >
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{payType.name}（{channel.name}）</div>
                  <div className="text-xs text-muted-foreground">
                    {payType.code === 'wechat' ? '使用微信扫码支付' : '使用支付宝扫码支付'}
                  </div>
                </div>
                {selectedPaymentMethod === methodCode && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            )
          }
        })
      } else {
        // 单一支付方式的渠道
        const IconComponent = getPaymentIcon(channel.code)
        const colorClass = getPaymentIconColorClass(channel.code)
        
        options.push(
          <div
            key={channel.code}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedPaymentMethod === channel.code
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedPaymentMethod(channel.code)}
          >
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{channel.name}</div>
              <div className="text-xs text-muted-foreground">
                {channel.code === 'wechat' && '使用微信扫码支付'}
                {channel.code === 'alipay' && '使用支付宝扫码支付'}
                {channel.code === 'test' && '模拟支付，用于测试'}
              </div>
            </div>
            {selectedPaymentMethod === channel.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
        )
      }
    })
    
    return options
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
              {availableChannels.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  暂无可用的支付方式
                </div>
              ) : (
                renderPaymentOptions()
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleConfirmPurchase} 
              disabled={purchasing === selectedProduct?.id || !selectedPaymentMethod || availableChannels.length === 0}
            >
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
