'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Crown, Key, Check, Loader2 } from 'lucide-react'
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

export default function ShopPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

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

  // 购买产品
  const handlePurchase = async (product: Product) => {
    if (!isLoggedIn) {
      toast.error('请先登录')
      router.push('/login')
      return
    }

    setPurchasing(product.id)
    try {
      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: product.id
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('订单创建成功，正在跳转到订单页面...')
        // 跳转到订单页面
        router.push('/orders')
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
                    onClick={() => handlePurchase(product)}
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
    </div>
  )
}
