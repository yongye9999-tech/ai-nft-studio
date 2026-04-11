import axios from 'axios'

export type AIEngine = 'huggingface' | 'openai'

export interface StyleOption {
  id: string
  label: string
  icon: string
  prompt: string
}

export const STYLE_PROMPTS: Record<string, string> = {
  cyberpunk: 'cyberpunk neon city, futuristic, dark atmosphere, glowing lights',
  watercolor: 'watercolor painting, soft pastel colors, artistic, wet paper texture',
  oilpaint: 'oil painting, thick brushstrokes, classic art, impressionist style',
  pixel: 'pixel art, 8-bit retro style, limited color palette, game sprite',
  anime: 'anime style, Japanese animation, clean line art, vibrant colors, manga',
  '3d': '3D render, photorealistic, octane render, subsurface scattering, 8K UHD',
}

export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'cyberpunk', label: '赛博朋克', icon: '🌆', prompt: STYLE_PROMPTS.cyberpunk },
  { id: 'watercolor', label: '水彩', icon: '🎨', prompt: STYLE_PROMPTS.watercolor },
  { id: 'oilpaint', label: '油画', icon: '🖼️', prompt: STYLE_PROMPTS.oilpaint },
  { id: 'pixel', label: '像素艺术', icon: '👾', prompt: STYLE_PROMPTS.pixel },
  { id: 'anime', label: '日本动漫', icon: '⛩️', prompt: STYLE_PROMPTS.anime },
  { id: '3d', label: '3D 渲染', icon: '💎', prompt: STYLE_PROMPTS['3d'] },
]

export interface GenerateResult {
  imageUrl: string
  imageData?: string
}

/**
 * Generates an image using HuggingFace SDXL via the Next.js API route.
 */
export async function generateWithHuggingFace(
  prompt: string,
  styleId: string
): Promise<GenerateResult> {
  const stylePrompt = STYLE_PROMPTS[styleId] ?? ''
  const res = await axios.post<GenerateResult>('/api/generate', {
    prompt,
    style: stylePrompt,
    engine: 'huggingface',
  })
  return res.data
}

/**
 * Generates an image using OpenAI DALL-E 3 via the Next.js API route.
 */
export async function generateWithOpenAI(
  prompt: string,
  styleId: string
): Promise<GenerateResult> {
  const stylePrompt = STYLE_PROMPTS[styleId] ?? ''
  const res = await axios.post<GenerateResult>('/api/generate', {
    prompt,
    style: stylePrompt,
    engine: 'openai',
  })
  return res.data
}

/**
 * Dispatches image generation to the chosen AI engine.
 */
export async function generateImage(
  prompt: string,
  styleId: string,
  engine: AIEngine
): Promise<GenerateResult> {
  if (engine === 'openai') {
    return generateWithOpenAI(prompt, styleId)
  }
  return generateWithHuggingFace(prompt, styleId)
}
