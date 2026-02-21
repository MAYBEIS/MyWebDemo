'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Trash2, Loader2, Key, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

// 产品密钥类型定义
interface ProductKey {
  id: string
  productId: string
  key: string
  status: string
  orderId: string | null
  userId: string | null
  expiresAt: string | null
  createdAt: string
  usedAt: string | null
  products: {
    id: string
    name: string
    type: string
  }
  orders?: {
    id: string
    orderNo: string
    userId: string
  } | null
  users?: {
    id: string
    name: string
    email: string
  } | null
}

// 产品类型定义
interface Product {
  id: string
  name: string
  type: string
}

// 密钥状态
const keyStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: '可用', variant: 'default' },
  sold: { label: '已售', variant: 'secondary' },
  used: { label: '已使用', variant: 'outline' },
  expired: { label: '已过期', variant: 'destructive' }
}

interface ProductKeysManagerProps {
  initialKeys?: ProductKey[]
}

export function ProductKeysManager({ initialKeys }: ProductKeysManagerProps) {
  const [keys, setKeys] = useState<ProductKey[]>(initialKeys || [])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(!initialKeys)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // 筛选状态
  const [filterProductId, setFilterProductId] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 表单状态
  const [formData, setFormData] = useState({
    productId: '',
    keys: '',
    expiresInDays: ''
  })

  // 获取密钥列表
  useEffect(() => {
    if (!initialKeys) {
      fetchKeys()
    }
    fetchProducts()
  }, [initialKeys, filterProductId, filterStatus])

  const fetchKeys = async () => {
    try {
      let url = '/api/shop/keys'
      const params = new URLSearchParams()
      if (filterProductId && filterProductId !== 'all') params.append('productId', filterProductId)
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus)
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setKeys(data.data)
      }
    } catch (error) {
      console.error('获取密钥列表失败:', error)
      toast.error('获取密钥列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/shop/products?status=all')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data.filter((p: Product) => p.type !== 'membership'))
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
    }
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      productId: '',
      keys: '',
      expiresInDays: ''
    })
  }

  // 批量创建密钥
  const handleCreateKeys = async () => {
    if (!formData.productId || !formData.keys.trim()) {
      toast.error('请选择产品并输入密钥')
      return
    }

    // 解析密钥（每行一个）
    const keyList = formData.keys
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    if (keyList.length === 0) {
      toast.error('请输入至少一个密钥')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/shop/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: formData.productId,
          keys: keyList,
          expiresInDays: formData.expiresInDays
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.data.message)
        setDialogOpen(false)
        resetForm()
        fetchKeys()
      } else {
        toast.error(data.error || '创建失败')
      }
    } catch (error) {
      console.error('创建密钥失败:', error)
      toast.error('创建密钥失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除密钥
  const handleDelete = async (keyId: string) => {
    if (!confirm('确定要删除此密钥吗？')) return

    try {
      const response = await fetch(`/api/shop/keys?id=${keyId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('密钥已删除')
        fetchKeys()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除密钥失败:', error)
      toast.error('删除密钥失败')
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

  // 获取状态显示
  const getStatusBadge = (status: string) => {
    const config = keyStatusMap[status] || { label: status, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
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
              <Key className="h-5 w-5" />
              产品密钥管理
            </CardTitle>
            <CardDescription>管理序列号和激活码</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                批量添加密钥
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>批量添加密钥</DialogTitle>
                <DialogDescription>
                  每行输入一个密钥，支持批量导入
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="productId">选择产品 *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData({ ...formData, productId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择产品" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keys">密钥列表 (每行一个) *</Label>
                  <Textarea
                    id="keys"
                    value={formData.keys}
                    onChange={(e) => setFormData({ ...formData, keys: e.target.value })}
                    placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresInDays">有效期 (天，留空表示永久)</Label>
                  <Input
                    id="expiresInDays"
                    type="number"
                    value={formData.expiresInDays}
                    onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                    placeholder="365"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateKeys} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 筛选器 */}
        <div className="flex gap-4 mb-4">
          <Select value={filterProductId} onValueChange={setFilterProductId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="筛选产品" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部产品</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(keyStatusMap).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无密钥，点击上方按钮添加
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>密钥</TableHead>
                <TableHead>产品</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>所属用户</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((keyItem) => (
                <TableRow key={keyItem.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {keyItem.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(keyItem.key)}
                      >
                        {copiedKey === keyItem.key ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{keyItem.products?.name || '-'}</TableCell>
                  <TableCell>{getStatusBadge(keyItem.status)}</TableCell>
                  <TableCell>
                    {keyItem.users ? (
                      <div>
                        <div className="font-medium">{keyItem.users.name}</div>
                        <div className="text-xs text-muted-foreground">{keyItem.users.email}</div>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(keyItem.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {keyItem.status === 'available' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(keyItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
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
