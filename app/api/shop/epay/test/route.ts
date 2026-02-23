import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { generateEpaySign } from '@/lib/epay'

/**
 * 测试易支付连接
 * POST /api/shop/epay/test
 * 
 * 验证易支付配置是否正确
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { pid, key, gateway } = body

    // 验证必要参数
    if (!pid || !key || !gateway) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 规范化网关地址
    let normalizedGateway = gateway.trim()
    // 移除末尾斜杠
    if (normalizedGateway.endsWith('/')) {
      normalizedGateway = normalizedGateway.slice(0, -1)
    }
    // 确保有协议
    if (!normalizedGateway.startsWith('http://') && !normalizedGateway.startsWith('https://')) {
      normalizedGateway = 'https://' + normalizedGateway
    }

    console.log('[易支付测试] 开始测试连接:', normalizedGateway)

    // 构建测试请求参数（查询商户信息）
    const testParams: Record<string, string> = {
      pid: pid,
      act: 'query'
    }

    // 生成签名
    const sign = generateEpaySign(testParams, key)
    testParams.sign = sign
    testParams.sign_type = 'MD5'

    try {
      // 尝试调用易支付API
      const apiUrl = `${normalizedGateway}/api.php`
      const queryString = Object.keys(testParams)
        .map(k => `${k}=${encodeURIComponent(testParams[k])}`)
        .join('&')

      console.log('[易支付测试] 请求URL:', `${apiUrl}?${queryString}`)

      const response = await fetch(`${apiUrl}?${queryString}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; EpayTest/1.0)'
        },
        // 设置超时
        signal: AbortSignal.timeout(10000)
      })

      const responseText = await response.text()
      console.log('[易支付测试] 响应状态:', response.status)
      console.log('[易支付测试] 响应内容:', responseText)

      // 尝试解析JSON响应
      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        // 如果不是JSON，可能是HTML错误页面
        if (responseText.includes('<') || response.status !== 200) {
          return NextResponse.json({
            success: false,
            error: '支付网关地址无效或无法访问，请检查网关地址是否正确'
          })
        }
        // 某些易支付平台返回纯文本
        if (responseText.includes('success') || responseText.includes('ok')) {
          return NextResponse.json({
            success: true,
            message: '连接测试成功'
          })
        }
        return NextResponse.json({
          success: false,
          error: '无法识别的响应格式，请检查网关地址'
        })
      }

      // 检查API响应
      if (result.code === 1 || result.ret === 1 || result.status === 'success') {
        return NextResponse.json({
          success: true,
          message: '连接测试成功',
          data: {
            merchantName: result.name || result.merchant_name || '未知',
            balance: result.money || result.balance || '未知'
          }
        })
      } else if (result.code === -1 || result.ret === -1) {
        // 签名验证失败，说明密钥错误
        return NextResponse.json({
          success: false,
          error: '商户密钥验证失败，请检查密钥是否正确'
        })
      } else if (result.code === -2 || result.ret === -2) {
        // 商户不存在
        return NextResponse.json({
          success: false,
          error: '商户ID不存在，请检查商户ID是否正确'
        })
      } else {
        // 其他错误
        return NextResponse.json({
          success: false,
          error: result.msg || result.message || '连接测试失败，请检查配置'
        })
      }
    } catch (fetchError: any) {
      console.error('[易支付测试] 请求失败:', fetchError)
      
      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        return NextResponse.json({
          success: false,
          error: '连接超时，请检查网关地址是否正确或网络是否通畅'
        })
      }
      
      if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
        return NextResponse.json({
          success: false,
          error: '无法连接到支付网关，请检查网关地址是否正确'
        })
      }
      
      return NextResponse.json({
        success: false,
        error: '网络请求失败，请检查网关地址和网络连接'
      })
    }
  } catch (error) {
    console.error('[易支付测试] 处理失败:', error)
    return NextResponse.json(
      { success: false, error: '测试连接失败' },
      { status: 500 }
    )
  }
}
