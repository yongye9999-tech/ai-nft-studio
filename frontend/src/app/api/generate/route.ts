import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

type AIEngine = 'huggingface' | 'openai'

interface GenerateRequest {
  prompt: string
  style: string
  engine: AIEngine
}

const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'

async function generateWithHuggingFace(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY
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

    const fullPrompt = style ? `${prompt}, ${style} style, highly detailed, 4k` : prompt

    let imageUrl: string
    let imageData: string | null = null

    if (engine === 'openai') {
      imageUrl = await generateWithOpenAI(fullPrompt)
    } else {
      imageData = await generateWithHuggingFace(fullPrompt)
      imageUrl = imageData
    }

    return NextResponse.json({ imageUrl, imageData })
  } catch (err: unknown) {
    console.error('[generate] Error:', err)
    const message = err instanceof Error ? err.message : 'AI 生成失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
