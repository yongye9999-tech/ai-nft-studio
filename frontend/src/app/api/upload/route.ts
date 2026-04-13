import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { checkRateLimit } from '@/lib/rate-limiter'

interface UploadRequest {
  imageData: string
  name: string
  description: string
  attributes?: { trait_type: string; value: string }[]
  // Optional extended metadata fields
  imageUri?: string        // Pre-uploaded image URI (skip re-upload if provided)
  ai_engine?: string       // e.g. 'huggingface' | 'openai'
  ai_model?: string        // e.g. 'stabilityai/stable-diffusion-xl-base-1.0' | 'dall-e-3'
  generation_prompt?: string  // Original user prompt (for provenance)
  license?: string         // e.g. 'CC0' | 'CC BY 4.0' | 'All Rights Reserved'
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
  // ── Rate limiting ─────────────────────────────────────────────────────────
  const rateLimit = checkRateLimit(req)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    )
  }

  try {
    const body = (await req.json()) as UploadRequest
    const {
      imageData,
      name,
      description,
      attributes = [],
      imageUri: preUploadedImageUri,
      ai_engine,
      ai_model,
      generation_prompt,
      license = 'All Rights Reserved',
    } = body

    // Use a pre-uploaded image URI if provided (avoids re-uploading on metadata-only calls)
    let imageUri: string
    if (preUploadedImageUri) {
      imageUri = preUploadedImageUri
    } else {
      if (!imageData) {
        return NextResponse.json({ error: '图片数据不能为空' }, { status: 400 })
      }
      imageUri = await uploadImageToPinata(imageData)
    }

    // Build extended metadata following ERC721 metadata standard + custom AI provenance fields
    const metadata: Record<string, unknown> = {
      name: name || 'AI Generated NFT',
      description: description || 'Created with AI+NFT Studio',
      image: imageUri,
      attributes,
      created_by: 'AI+NFT Studio',
      created_at: new Date().toISOString(),
      license,
    }

    // AI provenance fields (only include when provided)
    if (ai_engine) metadata.ai_engine = ai_engine
    if (ai_model) metadata.ai_model = ai_model
    if (generation_prompt) metadata.generation_prompt = generation_prompt

    const metadataUri = await uploadMetadataToPinata(metadata)

    return NextResponse.json({ metadataUri, imageUri })
  } catch (err: unknown) {
    console.error('[upload] Error:', err)
    const message = err instanceof Error ? err.message : 'IPFS 上传失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
