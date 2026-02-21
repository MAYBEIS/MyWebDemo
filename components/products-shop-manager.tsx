'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Key, Loader2, Package } from 'lucide-react'
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
  status: boolean
  sortOrder: number
  createdAt: string
  availableStock?: number
}

// 产品类型选项
const productTypes = [
  { value: 'membership', label: '会员' },
  { value: 'serial_key', label: '序列号' },
  { value: 'digital', label: '数字产品' }
]

export function ProductsShopManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    type: 'membership',
    duration: '',
    features: '',
    image: '',
    stock: '-1',
    sortOrder: '0',
    status: true
  })

  // 获取产品列表
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/shop/products?status=all')
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

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      type: 'membership',
      duration: '',
      features: '',
      image: '',
      stock: '-1',
      sortOrder: '0',
      status: true
    })
    setEditingProduct(null)
  }

  // 打开编辑对话框
  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      type: product.type,
      duration: product.duration?.toString() || '',
      features: product.features || '',
      image: product.image || '',
      stock: product.stock.toString(),
      sortOrder: product.sortOrder.toString(),
      status: product.status
    })
    setDialogOpen(true)
  }

  // 保存产品
  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast.error('请填写产品名称和价格')
      return
    }

    setSaving(true)
    try {
      const url = '/api/shop/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const body = editingProduct
        ? { id: editingProduct.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      if (data.success) {
        toast.success(editingProduct ? '产品已更新' : '产品已创建')
        setDialogOpen(false)
        resetForm()
        fetchProducts()
      } else {
        toast.error(data.error || '保存失败')
      }
    } catch (error) {
      console.error('保存产品失败:', error)
      toast.error('保存产品失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除产品
  const handleDelete = async (productId: string) => {
    if (!confirm('确定要删除此产品吗？此操作不可恢复。')) return

    try {
      const response = await fetch(`/api/shop/products?id=${productId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('产品已删除')
        fetchProducts()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除产品失败:', error)
      toast.error('删除产品失败')
    }
  }

  // 格式化价格
  const formatPrice = (price: number) => `¥${price.toFixed(2)}`

  // 获取产品类型名称
  const getTypeName = (type: string) => {
    return productTypes.find(t => t.value === type)?.label || type
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              产品管理
            </CardTitle>
            <CardDescription>管理商店中的虚拟产品</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加产品
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? '编辑产品' : '添加产品'}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? '修改产品信息' : '创建新的虚拟产品'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">产品名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入产品名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">产品描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入产品描述"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">价格 (元) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">产品类型</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.type === 'membership' && (
                  <div className="space-y-2">
                    <Label htmlFor="duration">会员时长 (天)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="features">产品特性 (每行一个)</Label>
                  <Textarea
                    id="features"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="特性1&#10;特性2&#10;特性3"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">库存 (-1为无限)</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">排序</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="status"
                    checked={formData.status}
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                  />
                  <Label htmlFor="status">上架销售</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无产品，点击上方按钮添加
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>库存</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.duration && (
                        <div className="text-xs text-muted-foreground">
                          {product.duration >= 365 ? '年费' : `${product.duration}天`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getTypeName(product.type)}</Badge>
                  </TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    {product.stock === -1 ? (
                      <Badge variant="outline">无限</Badge>
                    ) : (
                      <span>{product.availableStock ?? product.stock}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status ? 'default' : 'secondary'}>
                      {product.status ? '上架' : '下架'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
