'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductsShopManager } from '@/components/products-shop-manager'
import { ProductKeysManager } from '@/components/product-keys-manager'
import { OrdersManager } from '@/components/orders-manager'
import { Package, Key, ShoppingCart } from 'lucide-react'

export default function AdminShopPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">商店管理</h1>
        <p className="text-muted-foreground">管理产品、密钥和订单</p>
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
        </TabsList>

        <TabsContent value="products">
          <ProductsShopManager />
        </TabsContent>

        <TabsContent value="keys">
          <ProductKeysManager />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
