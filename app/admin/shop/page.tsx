import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-service"
import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProductsShopManager } from "@/components/products-shop-manager"
import { ProductKeysManager } from "@/components/product-keys-manager"
import { OrdersManager } from "@/components/orders-manager"
import { PaymentChannelManager } from "@/components/payment-channel-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Key, ShoppingCart, CreditCard } from "lucide-react"
import prisma from "@/lib/prisma"

export const metadata = {
  title: "商店管理 | SysLog 管理后台",
  description: "管理产品、密钥、订单和支付渠道",
}

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

export default async function AdminShopPage() {
  const user = await getCurrentUser()
  
  // 检查是否登录
  if (!user) {
    redirect("/login?redirect=/admin/shop")
  }
  
  // 检查是否是管理员
  if (!user.isAdmin) {
    redirect("/")
  }
  
  // 获取产品列表
  const products = await prisma.products.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          product_keys: {
            where: { status: "available" }
          }
        }
      }
    }
  })

  // 获取密钥列表
  const keys = await prisma.product_keys.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      products: {
        select: { id: true, name: true, type: true }
      }
    }
  })

  // 获取订单列表
  const orders = await prisma.orders.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      products: {
        select: { id: true, name: true, type: true, image: true }
      },
      users: {
        select: { id: true, name: true, email: true }
      },
      product_keys: {
        select: { id: true, key: true, status: true, expiresAt: true }
      }
    }
  })

  // 获取支付渠道列表
  const paymentChannels = await prisma.payment_channels.findMany()

  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="flex max-w-7xl mx-auto px-6 pt-20 pb-16">
        <AdminSidebar />
        <div className="flex-1 ml-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">商店管理</h1>
            <p className="text-muted-foreground">管理产品、密钥、订单和支付渠道</p>
          </div>

          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                产品管理
              </TabsTrigger>
              <TabsTrigger value="keys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                密钥管理
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                订单管理
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                支付渠道
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <ProductsShopManager initialProducts={JSON.parse(JSON.stringify(products))} />
            </TabsContent>

            <TabsContent value="keys">
              <ProductKeysManager initialKeys={JSON.parse(JSON.stringify(keys))} />
            </TabsContent>

            <TabsContent value="orders">
              <OrdersManager initialOrders={JSON.parse(JSON.stringify(orders))} />
            </TabsContent>

            <TabsContent value="payment">
              <PaymentChannelManager initialChannels={JSON.parse(JSON.stringify(paymentChannels))} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
