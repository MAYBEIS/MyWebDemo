import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'
import { uploadImage } from '@/lib/image-service'

/**
 * POST /api/auth/avatar
 * 上传用户头像
 * Content-Type: multipart/form-data
 * Field: avatar (图片文件)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 解析 multipart 表单数据
    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择图片文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的图片格式，请上传 JPG、PNG、GIF 或 WebP 格式' },
        { status: 400 }
      )
    }

    // 验证文件大小 (最大 2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 2MB' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 上传图片
    const result = await uploadImage(buffer, file.name, file.type)

    // 更新用户头像
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { avatar: result.url },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        isAdmin: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        avatar: result.url,
        user: updatedUser,
      },
    })
  } catch (error) {
    console.error('上传头像失败:', error)
    return NextResponse.json(
      { success: false, error: '上传头像失败，请稍后重试' },
      { status: 500 }
    )
  }
}
