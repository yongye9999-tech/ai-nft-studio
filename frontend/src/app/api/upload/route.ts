import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

interface UploadRequest {
  imageData: string
  name: string
  description: string
  attributes?: { trait_type: string; value: string }[]
}

interface PinataResponse {
  IpfsHash: string
}

const PINATA_BASE = 'https://api.pinata.cloud'

function getPinataHeaders() {
  const apiKey = process.env.PINATA_API_KEY
  const secretKey = process.env.PINATA_SECRET_API_KEY
  if (!apiKey || !secretKey) {
    throw new Error('Pinata API keys not configured')
  }
  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: secretKey,
  }
}

async function uploadImageToPinata(imageData: string): Promise<string> {
  // Strip the data URI prefix if present
  const base64 = imageData.startsWith('data:')
    ? imageData.split(',')[1]
    : imageData
  const buffer = Buffer.from(base64, 'base64')

  const formData = new FormData()
  const blob = new Blob([buffer], { type: 'image/jpeg' })
  formData.append('file', blob, 'nft-image.jpg')
  formData.append(
    'pinataMetadata',
    JSON.stringify({ name: `nft-image-${Date.now()}.jpg` })
  )

  const response = await axios.post<PinataResponse>(
    `${PINATA_BASE}/pinning/pinFileToIPFS`,
    formData,
    {
      headers: {
        ...getPinataHeaders(),
        'Content-Type': 'multipart/form-data',
      },
      maxBodyLength: Infinity,
      timeout: 60_000,
    }
  )

  return `ipfs://${response.data.IpfsHash}`
}

async function uploadMetadataToPinata(metadata: object): Promise<string> {
  const response = await axios.post<PinataResponse>(
    `${PINATA_BASE}/pinning/pinJSONToIPFS`,
    {
      pinataContent: metadata,
      pinataMetadata: { name: `nft-metadata-${Date.now()}.json` },
    },
    {
      headers: {
        ...getPinataHeaders(),
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  )

  return `ipfs://${response.data.IpfsHash}`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UploadRequest
    const { imageData, name, description, attributes = [] } = body

    if (!imageData) {
      return NextResponse.json({ error: '图片数据不能为空' }, { status: 400 })
    }

    // 1. Upload image
    const imageUri = await uploadImageToPinata(imageData)

    // 2. Build and upload metadata
    const metadata = {
      name: name || 'AI Generated NFT',
      description: description || 'Created with AI+NFT Studio',
      image: imageUri,
      attributes,
      created_by: 'AI+NFT Studio',
      created_at: new Date().toISOString(),
    }

    const metadataUri = await uploadMetadataToPinata(metadata)

    return NextResponse.json({ metadataUri, imageUri })
  } catch (err: unknown) {
    console.error('[upload] Error:', err)
    const message = err instanceof Error ? err.message : 'IPFS 上传失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
