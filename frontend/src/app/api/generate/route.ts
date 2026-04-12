import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

type AIEngine = 'huggingface' | 'openai'

interface GenerateRequest {
  prompt: string
  style: string
  engine: AIEngine
}

const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'

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

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const response = await axios.post(
    'https://api.openai.com/v1/images/generations',
    {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest
    const { prompt, style, engine = 'huggingface' } = body

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

    const fullPrompt = style ? `${prompt}, ${style} style, highly detailed, 4k` : prompt

    let imageUrl: string
    let imageData: string | null = null

    if (engine === 'openai') {
      imageUrl = await generateWithOpenAI(fullPrompt)
    } else {
      imageData = await generateWithHuggingFace(fullPrompt)
      imageUrl = imageData
    }

    return NextResponse.json({ imageUrl, imageData, engine, model: engine === 'openai' ? 'dall-e-3' : HF_MODEL })
  } catch (err: unknown) {
    console.error('[generate] Error:', err)
    const message = err instanceof Error ? err.message : 'AI 生成失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
