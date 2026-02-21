/**
 * 图片上传服务
 * 支持多种图床：本地存储、SM.MS、ImgBB、GitHub
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 配置类型
interface UploadConfig {
  provider: string
  maxFileSize: number
  allowedTypes: string[]
}

// 文件信息
interface UploadedFile {
  url: string
  filename: string
}

/**
 * 获取上传配置
 */
function getConfig(): UploadConfig {
  return {
    provider: process.env.IMAGE_HOST_PROVIDER || 'local',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 默认 5MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  }
}

/**
 * 验证文件类型
 */
function validateFileType(contentType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(contentType)
}

/**
 * 验证文件大小
 */
function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize
}

/**
 * 生成本地存储的文件路径
 */
function generateLocalPath(ext: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `/uploads/avatars/${timestamp}-${random}.${ext}`
}

/**
 * 上传到本地存储
 */
async function uploadToLocal(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadedFile> {
  const config = getConfig()
  
  // 提取文件扩展名
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  
  // 生成文件路径
  const filePath = generateLocalPath(ext)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  
  // 确保目录存在
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }
  
  // 写入文件
  const fullPath = path.join(uploadDir, path.basename(filePath))
  await writeFile(fullPath, buffer)
  
  return {
    url: filePath,
    filename: path.basename(filePath),
  }
}

/**
 * 上传到 SM.MS 图床
 */
async function uploadToSMMS(buffer: Buffer, filename: string): Promise<UploadedFile> {
  const apiToken = process.env.SMMS_API_TOKEN
  
  if (!apiToken) {
    throw new Error('SMMS API Token 未配置')
  }
  
  const formData = new FormData()
  // 将 Buffer 转换为 Uint8Array
  const uint8Array = new Uint8Array(buffer)
  const blob = new Blob([uint8Array])
  const file = new File([blob], filename)
  formData.append('smfile', file)
  
  const response = await fetch('https://sm.ms/api/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
    },
    body: formData,
  })
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || 'SM.MS 上传失败')
  }
  
  return {
    url: data.data.url,
    filename: filename,
  }
}

/**
 * 上传到 ImgBB 图床
 */
async function uploadToImgBB(buffer: Buffer, filename: string): Promise<UploadedFile> {
  const apiKey = process.env.IMGBB_API_KEY
  
  if (!apiKey) {
    throw new Error('ImgBB API Key 未配置')
  }
  
  const base64 = buffer.toString('base64')
  
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: new URLSearchParams({
      image: base64,
      name: filename,
    }),
  })
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error?.message || 'ImgBB 上传失败')
  }
  
  return {
    url: data.data.url,
    filename: filename,
  }
}

/**
 * 上传到 GitHub
 */
async function uploadToGitHub(buffer: Buffer, filename: string): Promise<UploadedFile> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const owner = process.env.GITHUB_OWNER
  
  if (!token || !repo || !owner) {
    throw new Error('GitHub 配置不完整')
  }
  
  const ext = filename.split('.').pop() || 'png'
  const timestamp = Date.now()
  const newFilename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  const path_ = `avatars/${newFilename}`
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path_}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload avatar: ${newFilename}`,
        content: buffer.toString('base64'),
      }),
    }
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'GitHub 上传失败')
  }
  
  const data = await response.json()
  
  // 使用 GitHub raw URL
  return {
    url: data.content.download_url,
    filename: newFilename,
  }
}

/**
 * 主上传函数
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadedFile> {
  const config = getConfig()
  
  // 验证文件类型
  if (!validateFileType(contentType, config.allowedTypes)) {
    throw new Error(`不支持的文件类型: ${contentType}`)
  }
  
  // 验证文件大小
  if (!validateFileSize(buffer.length, config.maxFileSize)) {
    throw new Error(`文件大小超过限制: ${config.maxFileSize / 1024 / 1024}MB`)
  }
  
  // 根据配置选择上传方式
  switch (config.provider) {
    case 'smms':
      return uploadToSMMS(buffer, filename)
    case 'imgbb':
      return uploadToImgBB(buffer, filename)
    case 'github':
      return uploadToGitHub(buffer, filename)
    case 'local':
    default:
      return uploadToLocal(buffer, filename, contentType)
  }
}

/**
 * 删除本地存储的图片
 */
export async function deleteLocalImage(url: string): Promise<void> {
  if (!url.startsWith('/uploads/')) {
    return // 不是本地存储的图片，不删除
  }
  
  const fullPath = path.join(process.cwd(), 'public', url)
  
  try {
    const { unlink } = await import('fs/promises')
    await unlink(fullPath)
  } catch (error) {
    console.error('删除本地图片失败:', error)
  }
}
