import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, verifyToken } from '@/lib/auth-service'

// 获取当前请求中的用户（支持从header或cookie获取）
async function getUserFromRequest(request: NextRequest) {
  // 首先尝试从header获取
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return await verifyToken(token)
  }
  
  // 然后尝试从cookie获取
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/)
    if (tokenMatch) {
      return await verifyToken(tokenMatch[1])
    }
  }
  
  return null
}

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
        topic_votes: true, // 获取所有投票以计算 upvotes/downvotes
        topic_options: true, // 获取投票选项（多选一类型）
        topic_votes_multiple: true, // 获取多选一投票记录
        _count: {
          select: {
            topic_votes: true,
            topic_comments: true,
            topic_votes_multiple: true
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
    let userMultipleVotes: Record<string, string> = {} // topicId -> optionId
    let currentUser = null
    
    // 优先从header获取，其次从cookie获取
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      currentUser = await verifyToken(token)
    }
    
    // 如果header没有，尝试从cookie获取
    if (!currentUser) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/)
        if (tokenMatch) {
          currentUser = await verifyToken(tokenMatch[1])
        }
      }
    }
    
    if (currentUser) {
      // binary类型投票
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

      // 多选一类型投票
      const multipleVotes = await prisma.topic_votes_multiple.findMany({
        where: {
          userId: currentUser.id,
          topicId: {
            in: topics.map((t: any) => t.id)
          }
        }
      })
      
      multipleVotes.forEach((vote: any) => {
        userMultipleVotes[vote.topicId] = vote.optionId
      })
    }

    const result = topics.map((topic: any) => {
      const voteType = topic.voteType || 'binary'
      
      // binary类型计算赞同和反对
      const upvotes = topic.topic_votes ? topic.topic_votes.filter((v: any) => v.direction === 'up').length : 0
      const downvotes = topic.topic_votes ? topic.topic_votes.filter((v: any) => v.direction === 'down').length : 0
      
      // 多选一类型处理选项
      let options = null
      if (voteType === 'multiple' && topic.topic_options) {
        options = topic.topic_options.map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          votes: opt.votes
        }))
      }
      
      // 计算总投票数
      const totalVotes = voteType === 'multiple' 
        ? topic._count.topic_votes_multiple 
        : upvotes + downvotes
       
      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        category: topic.category,
        voteType,
        options,
        upvotes,
        downvotes,
        totalVotes,
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
        userVote: voteType === 'multiple' ? userMultipleVotes[topic.id] || null : userVotes[topic.id] || null
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
    // 支持从header或cookie获取用户
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { action, topicId, direction, title, description, category, tags, voteType, optionId, options } = body

    // 提议话题
    if (action === 'propose') {
      if (!title || !description) {
        return NextResponse.json({ 
          success: false, 
          error: '缺少必要参数' 
        }, { status: 400 })
      }

      // 创建话题
      const topicIdNew = `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 如果是多选一类型，同时创建选项
      if (voteType === 'multiple' && options) {
        const optionTexts = options.split('\n').filter((o: string) => o.trim())
        for (let i = 0; i < optionTexts.length; i++) {
          await prisma.topic_options.create({
            data: {
              id: `opt_${Date.now()}_${i}`,
              topicId: topicIdNew,
              text: optionTexts[i].trim(),
              votes: 0
            }
          })
        }
      }

      const newTopic = await prisma.trending_topics.create({
        data: {
          id: topicIdNew,
          title,
          description,
          category: category || '技术选型',
          tags: tags ? JSON.stringify(tags) : null,
          proposedBy: user.name,
          status: 'active', // 新话题直接显示
          voteType: voteType || 'binary',  // 投票类型
          votes: 0,
          heat: 1, // 初始热度
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        }
      })

      return NextResponse.json({ 
        success: true, 
        data: { id: newTopic.id }
      })
    }

    // 多选一投票
    if (voteType === 'multiple') {
      if (!topicId || !optionId) {
        return NextResponse.json({ 
          success: false, 
          error: '缺少必要参数' 
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

      // 检查选项是否存在
      const option = await prisma.topic_options.findUnique({
        where: { id: optionId }
      })

      if (!option || option.topicId !== topicId) {
        return NextResponse.json({ 
          success: false, 
          error: '选项不存在' 
        }, { status: 404 })
      }

      // 检查是否已经投过票
      const existingVote = await prisma.topic_votes_multiple.findUnique({
        where: {
          topicId_userId: {
            topicId,
            userId: user.id
          }
        }
      })

      if (existingVote) {
        if (existingVote.optionId === optionId) {
          // 取消投票
          await prisma.topic_votes_multiple.delete({
            where: { id: existingVote.id }
          })
          
          // 更新选项票数
          await prisma.topic_options.update({
            where: { id: optionId },
            data: { votes: { decrement: 1 } }
          })
          
          // 更新热度
          await prisma.trending_topics.update({
            where: { id: topicId },
            data: { heat: { decrement: 2 } }
          })
        } else {
          // 切换投票
          const oldOptionId = existingVote.optionId
          
          await prisma.topic_votes_multiple.update({
            where: { id: existingVote.id },
            data: { optionId }
          })
          
          // 旧选项票数-1
          await prisma.topic_options.update({
            where: { id: oldOptionId },
            data: { votes: { decrement: 1 } }
          })
          
          // 新选项票数+1
          await prisma.topic_options.update({
            where: { id: optionId },
            data: { votes: { increment: 1 } }
          })
          
          // 更新热度
          await prisma.trending_topics.update({
            where: { id: topicId },
            data: { heat: { increment: 2 } }
          })
        }
      } else {
        // 第一次投票
        await prisma.topic_votes_multiple.create({
          data: {
            id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            topicId,
            optionId,
            userId: user.id
          }
        })
        
        // 更新选项票数
        await prisma.topic_options.update({
          where: { id: optionId },
          data: { votes: { increment: 1 } }
        })
        
        // 更新热度
        await prisma.trending_topics.update({
          where: { id: topicId },
          data: { heat: { increment: 2 } }
        })
      }

      // 获取更新后的投票状态
      const updatedVote = await prisma.topic_votes_multiple.findUnique({
        where: {
          topicId_userId: {
            topicId,
            userId: user.id
          }
        }
      })

      return NextResponse.json({ 
        success: true, 
        data: {
          userVote: updatedVote ? updatedVote.optionId : null
        }
      })
    }

    // Binary类型投票（赞同/反对）
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
          id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
