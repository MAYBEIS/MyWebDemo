import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, verifyToken } from '@/lib/auth-service'

// 获取今日热榜话题
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sortBy = searchParams.get('sortBy') || 'votes' // votes, heat, comments
    const category = searchParams.get('category')

    // 构建查询条件
    const where: any = {
      status: 'active',
      endTime: {
        gte: new Date() // 只显示未过期的话题
      }
    }

    if (category) {
      where.category = category
    }

    // 获取话题列表
    const topics = await prisma.trending_topics.findMany({
      where,
      include: {
        topic_comments: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // 每个话题只取最新10条评论
        },
        _count: {
          select: {
            topic_votes: true,
            topic_comments: true
          }
        }
      },
      orderBy: sortBy === 'heat' 
        ? { heat: 'desc' }
        : sortBy === 'comments'
          ? { topic_comments: { _count: 'desc' } }
          : { votes: 'desc' }
    })

    // 获取用户投票状态（如果已登录）
    const authHeader = request.headers.get('authorization')
    let userVotes: Record<string, 'up' | 'down'> = {}
    let currentUser = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      currentUser = await verifyToken(token)
    }
    
    if (currentUser) {
      const votes = await prisma.topic_votes.findMany({
        where: {
          userId: currentUser.id,
          topicId: {
            in: topics.map((t: any) => t.id)
          }
        }
      })
      
      votes.forEach((vote: any) => {
        userVotes[vote.topicId] = vote.direction as 'up' | 'down'
      })
    }

    const result = topics.map((topic: any) => {
      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        category: topic.category,
        votes: topic.votes,
        heat: topic.heat,
        tags: topic.tags ? JSON.parse(topic.tags) : [],
        proposedBy: topic.proposedBy,
        timeLeft: topic.endTime 
          ? Math.max(0, Math.ceil((new Date(topic.endTime).getTime() - Date.now()) / (1000 * 60 * 60))) + ' 小时'
          : '无限',
        comments: topic.topic_comments.map((c: any) => ({
          id: c.id,
          author: c.userId,
          content: c.content,
          time: c.createdAt.toLocaleString('zh-CN', { 
            hour: 'numeric', 
            minute: 'numeric',
            hour12: false 
          })
        })),
        commentCount: topic._count.topic_comments,
        userVote: userVotes[topic.id] || null
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: result 
    })
  } catch (error) {
    console.error('获取热榜话题失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '获取热榜话题失败' 
    }, { status: 500 })
  }
}

// 投票
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 })
    }

    const { topicId, direction } = await request.json()

    if (!topicId || !direction) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数' 
      }, { status: 400 })
    }

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ 
        success: false, 
        error: '无效的投票方向' 
      }, { status: 400 })
    }

    // 检查话题是否存在
    const topic = await prisma.trending_topics.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      return NextResponse.json({ 
        success: false, 
        error: '话题不存在' 
      }, { status: 404 })
    }

    // 检查是否已经投过票
    const existingVote = await prisma.topic_votes.findUnique({
      where: {
        topicId_userId: {
          topicId,
          userId: user.id
        }
      }
    })

    let voteChange = 0

    if (existingVote) {
      if (existingVote.direction === direction) {
        // 取消投票
        await prisma.topic_votes.delete({
          where: { id: existingVote.id }
        })
        
        // 更新票数和热度
        voteChange = direction === 'up' ? -1 : 1
        const heatChange = -2
        
        await prisma.trending_topics.update({
          where: { id: topicId },
          data: {
            votes: { decrement: voteChange },
            heat: { increment: heatChange }
          }
        })
      } else {
        // 切换投票方向
        await prisma.topic_votes.update({
          where: { id: existingVote.id },
          data: { direction }
        })
        
        // 票数变化2（先减后增）
        voteChange = direction === 'up' ? 2 : -2
        const heatChange = 2
        
        await prisma.trending_topics.update({
          where: { id: topicId },
          data: {
            votes: { increment: voteChange },
            heat: { increment: heatChange }
          }
        })
      }
    } else {
      // 第一次投票
      await prisma.topic_votes.create({
        data: {
          topicId,
          userId: user.id,
          direction
        }
      })
      
      // 更新票数和热度
      voteChange = direction === 'up' ? 1 : -1
      const heatChange = 2
      
      await prisma.trending_topics.update({
        where: { id: topicId },
        data: {
          votes: { increment: voteChange },
          heat: { increment: heatChange }
        }
      })
    }

    // 获取更新后的投票状态
    const updatedVotes = await prisma.topic_votes.findMany({
      where: {
        topicId,
        userId: user.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        userVote: updatedVotes.length > 0 ? updatedVotes[0].direction : null
      }
    })
  } catch (error) {
    console.error('投票失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '投票失败' 
    }, { status: 500 })
  }
}
