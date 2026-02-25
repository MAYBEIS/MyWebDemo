import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * GET /api/admin/dashboard/stats
 * 获取仪表盘统计数据（管理员专用）
 * 返回：文章、用户、评论、订单统计，以及最近活动数据
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    // 检查是否是管理员
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    // 获取基础统计数据
    const [
      postsCount,
      usersCount,
      commentsCount,
      ordersCount,
      ordersRevenue,
      productsCount,
      pendingOrdersCount,
      publishedPostsCount,
      todayUsersCount,
      todayCommentsCount,
      todayOrdersCount,
      todayRevenue,
    ] = await Promise.all([
      // 文章总数
      prisma.posts.count(),
      // 用户总数
      prisma.users.count(),
      // 评论总数
      prisma.comments.count(),
      // 订单总数
      prisma.orders.count(),
      // 总收入（已支付订单）
      prisma.orders.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
      }),
      // 产品总数
      prisma.products.count(),
      // 待处理订单数
      prisma.orders.count({
        where: { status: 'pending' },
      }),
      // 已发布文章数
      prisma.posts.count({
        where: { published: true },
      }),
      // 今日新增用户
      prisma.users.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // 今日新增评论
      prisma.comments.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // 今日订单数
      prisma.orders.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // 今日收入
      prisma.orders.aggregate({
        where: {
          status: 'paid',
          paymentTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { amount: true },
      }),
    ])

    // 获取最近的文章（5篇）
    const recentPosts = await prisma.posts.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        views: true,
        published: true,
        users: {
          select: { name: true },
        },
      },
    })

    // 获取最近的评论（5条）
    const recentComments = await prisma.comments.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        users: {
          select: { id: true, name: true, avatar: true },
        },
        posts: {
          select: { id: true, title: true, slug: true },
        },
      },
    })

    // 获取最近的用户（5个）
    const recentUsers = await prisma.users.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        isAdmin: true,
      },
    })

    // 获取最近的订单（5个）
    const recentOrders = await prisma.orders.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        createdAt: true,
        paymentMethod: true,
        users: {
          select: { id: true, name: true, email: true },
        },
        products: {
          select: { id: true, name: true },
        },
      },
    })

    // 获取热门文章（按浏览量，5篇）
    const popularPosts = await prisma.posts.findMany({
      take: 5,
      orderBy: { views: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        likes: true,
        _count: {
          select: { comments: true },
        },
      },
    })

    // 获取最近7天的数据统计（用于图表）
    const last7Days = getLast7Days()
    const chartData = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const [posts, users, comments, orders, revenue] = await Promise.all([
          prisma.posts.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),
          prisma.users.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),
          prisma.comments.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),
          prisma.orders.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),
          prisma.orders.aggregate({
            where: {
              status: 'paid',
              paymentTime: { gte: startOfDay, lte: endOfDay },
            },
            _sum: { amount: true },
          }),
        ])

        return {
          date: date.toISOString().split('T')[0],
          displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
          posts,
          users,
          comments,
          orders,
          revenue: revenue._sum.amount || 0,
        }
      })
    )

    // 获取文章分类统计
    const categoryStats = await prisma.posts.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    // 获取订单状态分布
    const orderStatusStats = await prisma.orders.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        // 基础统计
        overview: {
          postsCount,
          usersCount,
          commentsCount,
          ordersCount,
          productsCount,
          totalRevenue: ordersRevenue._sum.amount || 0,
          pendingOrders: pendingOrdersCount,
          publishedPosts: publishedPostsCount,
        },
        // 今日统计
        today: {
          newUsers: todayUsersCount,
          newComments: todayCommentsCount,
          newOrders: todayOrdersCount,
          revenue: todayRevenue._sum.amount || 0,
        },
        // 最近活动
        recent: {
          posts: recentPosts.map((post) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            createdAt: post.createdAt,
            viewCount: post.views,
            published: post.published,
            author: post.users?.name || '未知',
          })),
          comments: recentComments.map((comment) => ({
            id: comment.id,
            content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
            createdAt: comment.createdAt,
            author: comment.users
              ? { id: comment.users.id, name: comment.users.name, avatar: comment.users.avatar }
              : null,
            post: comment.posts
              ? { id: comment.posts.id, title: comment.posts.title, slug: comment.posts.slug }
              : null,
          })),
          users: recentUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            createdAt: u.createdAt,
            isAdmin: u.isAdmin,
          })),
          orders: recentOrders.map((order) => ({
            id: order.id,
            orderNo: order.orderNo,
            amount: order.amount,
            status: order.status,
            createdAt: order.createdAt,
            paymentMethod: order.paymentMethod,
            user: order.users
              ? { id: order.users.id, name: order.users.name, email: order.users.email }
              : null,
            product: order.products
              ? { id: order.products.id, name: order.products.name }
              : null,
          })),
        },
        // 热门文章
        popularPosts: popularPosts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          viewCount: post.views,
          likeCount: post.likes,
          commentCount: post._count?.comments || 0,
        })),
        // 图表数据
        chartData,
        // 分类统计
        categoryStats: categoryStats.map((item) => ({
          category: item.category || '未分类',
          count: item._count.id,
        })),
        // 订单状态分布
        orderStatusStats: orderStatusStats.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
    })
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取仪表盘统计数据失败' },
      { status: 500 }
    )
  }
}

// 获取最近7天的日期数组
function getLast7Days(): Date[] {
  const days: Date[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date)
  }
  return days
}
