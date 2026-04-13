import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { checkRateLimit } from '@/lib/rate-limiter'

type AIEngine = 'huggingface' | 'openai' | 'stability' | 'replicate' | 'gemini'
type ImageQuality = 'draft' | 'standard' | 'hd'

interface GenerateRequest {
  prompt: string
  style: string
  engine: AIEngine
  quality?: ImageQuality
}

const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'

// Quality → resolution mapping for applicable engines
const QUALITY_SIZE: Record<ImageQuality, string> = {
  draft: '512x512',
  standard: '1024x1024',
  hd: '1024x1792',
}

// ── Content safety ────────────────────────────────────────────────────────────

// Basic blocklist for clearly prohibited content. In production, supplement
// this with OpenAI Moderation API or AWS Rekognition for robust filtering.
const BLOCKED_TERMS = [
  'nude', 'naked', 'nsfw', 'pornography', 'porn', 'explicit', 'sexual',
  'violence', 'gore', 'blood', 'murder', 'torture',
  'child', 'minor', 'underage', 'loli', 'shota',
  'deepfake', 'celebrity face',
]

function isSafePrompt(prompt: string): { safe: boolean; reason?: string } {
  const lower = prompt.toLowerCase()
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { safe: false, reason: `提示词包含不允许的内容: "${term}"` }
    }
  }
  return { safe: true }
}

/**
 * Calls the OpenAI Moderation API to check the prompt for policy violations.
 * Falls back gracefully if the API key is missing or the request fails.
 */
async function checkOpenAIModeration(prompt: string): Promise<{ flagged: boolean; reason?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { flagged: false }

  try {
    const response = await axios.post<{
      results: Array<{ flagged: boolean; categories: Record<string, boolean> }>
    }>(
      'https://api.openai.com/v1/moderations',
      { input: prompt },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 10_000,
      }
    )
    const result = response.data.results[0]
    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ')
      return { flagged: true, reason: `内容违规: ${flaggedCategories}` }
    }
    return { flagged: false }
  } catch {
    // Moderation API failure is non-fatal — continue generation
    return { flagged: false }
  }
}

// ── AI Generation ─────────────────────────────────────────────────────────────

async function generateWithHuggingFace(prompt: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HuggingFace API key not configured')

  const response = await axios.post(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    { inputs: prompt },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 60_000,
    }
  )

  const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64')
  return `data:image/jpeg;base64,${base64}`
}

async function generateWithOpenAI(prompt: string, quality: ImageQuality = 'standard'): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  // DALL-E 3 only supports 1024x1024, 1024x1792, 1792x1024
  const sizeMap: Record<ImageQuality, string> = {
    draft: '1024x1024',
    standard: '1024x1024',
    hd: '1024x1792',
  }

  const response = await axios.post(
    'https://api.openai.com/v1/images/generations',
    {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: sizeMap[quality],
      quality: quality === 'hd' ? 'hd' : 'standard',
      response_format: 'url',
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60_000,
    }
  )

  return (response.data as { data: { url: string }[] }).data[0].url
}

async function generateWithStability(prompt: string, quality: ImageQuality = 'standard'): Promise<string> {
  const apiKey = process.env.STABILITY_API_KEY
  if (!apiKey) throw new Error('Stability AI API key not configured')

  const size = quality === 'draft' ? { width: 512, height: 512 }
    : quality === 'hd' ? { width: 1344, height: 768 }
    : { width: 1024, height: 1024 }

  const response = await axios.post(
    'https://api.stability.ai/v2beta/stable-image/generate/sd3',
    {
      prompt,
      model: 'sd3.5-large',
      output_format: 'jpeg',
      ...size,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'image/*',
      },
      responseType: 'arraybuffer',
      timeout: 90_000,
    }
  )

  const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64')
  return `data:image/jpeg;base64,${base64}`
}

async function generateWithReplicate(prompt: string, quality: ImageQuality = 'standard'): Promise<string> {
  const apiKey = process.env.REPLICATE_API_KEY
  if (!apiKey) throw new Error('Replicate API key not configured')

  const size = QUALITY_SIZE[quality]
  const [width, height] = size.split('x').map(Number)

  // Start prediction
  const startResponse = await axios.post<{ id: string; urls: { get: string } }>(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-1-dev/predictions',
    { input: { prompt, width, height, num_inference_steps: quality === 'draft' ? 20 : 28 } },
    {
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30_000,
    }
  )

  const predictionId = startResponse.data.id
  const pollUrl = startResponse.data.urls.get

  // Poll until complete (max 120s)
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5_000))
    const poll = await axios.get<{ status: string; output?: string[] }>(pollUrl, {
      headers: { Authorization: `Token ${apiKey}` },
      timeout: 15_000,
    })
    if (poll.data.status === 'succeeded' && poll.data.output?.[0]) {
      return poll.data.output[0]
    }
    if (poll.data.status === 'failed') {
      throw new Error(`Replicate prediction ${predictionId} failed`)
    }
  }
  throw new Error('Replicate prediction timed out')
}

async function generateWithGemini(prompt: string, quality: ImageQuality = 'standard'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  const aspectRatio = quality === 'hd' ? '16:9' : '1:1'

  const response = await axios.post<{
    predictions: Array<{ bytesBase64Encoded: string; mimeType: string }>
  }>(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/us-central1/publishers/google/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60_000,
    }
  )

  const prediction = response.data.predictions?.[0]
  if (!prediction) throw new Error('Gemini returned no image')
  return `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`
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
    const body = (await req.json()) as GenerateRequest
    const { prompt, style, engine = 'huggingface', quality = 'standard' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: '提示词不能为空' }, { status: 400 })
    }

    // ── Step 1: Local blocklist check
    const localCheck = isSafePrompt(prompt)
    if (!localCheck.safe) {
      return NextResponse.json({ error: localCheck.reason }, { status: 400 })
    }

    // ── Step 2: OpenAI Moderation API (when OpenAI engine is selected or key available)
    if (engine === 'openai') {
      const modCheck = await checkOpenAIModeration(prompt)
      if (modCheck.flagged) {
        return NextResponse.json({ error: modCheck.reason }, { status: 400 })
      }
    }

    const qualitySuffix = quality === 'hd' ? ', highly detailed, 8K UHD, masterpiece' : quality === 'standard' ? ', highly detailed, 4k' : ''
    const fullPrompt = style ? `${prompt}, ${style} style${qualitySuffix}` : `${prompt}${qualitySuffix}`

    let imageUrl: string
    let imageData: string | null = null
    let modelName: string

    switch (engine) {
      case 'openai':
        imageUrl = await generateWithOpenAI(fullPrompt, quality)
        modelName = 'dall-e-3'
        break
      case 'stability':
        imageData = await generateWithStability(fullPrompt, quality)
        imageUrl = imageData
        modelName = 'sd3.5-large'
        break
      case 'replicate':
        imageUrl = await generateWithReplicate(fullPrompt, quality)
        modelName = 'flux-1-dev'
        break
      case 'gemini':
        imageData = await generateWithGemini(fullPrompt, quality)
        imageUrl = imageData
        modelName = 'imagen-3'
        break
      default:
        imageData = await generateWithHuggingFace(fullPrompt)
        imageUrl = imageData
        modelName = HF_MODEL
    }

    return NextResponse.json({ imageUrl, imageData, engine, model: modelName })
  } catch (err: unknown) {
    console.error('[generate] Error:', err)
    const message = err instanceof Error ? err.message : 'AI 生成失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
