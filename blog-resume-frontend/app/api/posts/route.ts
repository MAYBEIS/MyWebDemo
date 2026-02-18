import { NextRequest, NextResponse } from 'next/server';
import { getPosts, createPost } from '@/lib/posts-service';

/**
 * GET /api/posts
 * 获取所有博客文章列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');

    const posts = await getPosts({ page, limit, category });
    
    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts
 * 创建新的博客文章（需要认证）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, excerpt, category, tags, coverImage } = body;

    // 验证必填字段
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    const post = await createPost({
      title,
      content,
      excerpt,
      category,
      tags,
      coverImage,
      authorId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: post,
    }, { status: 201 });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json(
      { success: false, error: '创建文章失败' },
      { status: 500 }
    );
  }
}

// 临时导入，后续会移到独立的认证模块
async function verifyToken(token: string) {
  // TODO: 实现 JWT 验证逻辑
  return { id: '1', isAdmin: true };
}
