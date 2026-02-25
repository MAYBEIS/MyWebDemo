'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  value: string
  size?: number
  className?: string
}

/**
 * QR 码组件
 * 使用本地库生成二维码，避免外部 API 调用导致的卡顿
 */
export function QRCodeDisplay({ value, size = 200, className = '' }: QRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!value) return

    // 生成二维码数据 URL
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        setQrDataUrl(url)
        setError(false)
      })
      .catch(err => {
        console.error('生成二维码失败:', err)
        setError(true)
      })
  }, [value, size])

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-sm text-muted-foreground">二维码生成失败</span>
      </div>
    )
  }

  if (!qrDataUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-sm text-muted-foreground">生成中...</span>
      </div>
    )
  }

  return (
    <img 
      src={qrDataUrl} 
      alt="二维码" 
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
