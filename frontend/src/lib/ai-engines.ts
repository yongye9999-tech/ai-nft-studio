import axios from 'axios'

export type AIEngine = 'huggingface' | 'openai' | 'stability' | 'replicate' | 'gemini'

export type ImageQuality = 'draft' | 'standard' | 'hd'

export interface QualityOption {
  id: ImageQuality
  label: string
  description: string
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { id: 'draft', label: '草稿', description: '速度快，适合快速预览' },
  { id: 'standard', label: '标准', description: '均衡质量与速度' },
  { id: 'hd', label: '高清', description: '最高质量，耗时较长' },
]

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
  realistic: 'photorealistic, DSLR photography, hyperdetailed, natural lighting, 8K resolution',
  fantasy: 'fantasy illustration, magical world, epic scenery, concept art, highly detailed',
  architecture: 'architectural concept art, modern building design, blueprint aesthetic, detailed render',
  ink_wash: 'traditional Chinese ink wash painting, calligraphy brushwork, minimalist, monochrome',
}

export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'cyberpunk', label: '赛博朋克', icon: '🌆', prompt: STYLE_PROMPTS.cyberpunk },
  { id: 'watercolor', label: '水彩', icon: '🎨', prompt: STYLE_PROMPTS.watercolor },
  { id: 'oilpaint', label: '油画', icon: '🖼️', prompt: STYLE_PROMPTS.oilpaint },
  { id: 'pixel', label: '像素艺术', icon: '👾', prompt: STYLE_PROMPTS.pixel },
  { id: 'anime', label: '日本动漫', icon: '⛩️', prompt: STYLE_PROMPTS.anime },
  { id: '3d', label: '3D 渲染', icon: '💎', prompt: STYLE_PROMPTS['3d'] },
  { id: 'realistic', label: '写实照片', icon: '📸', prompt: STYLE_PROMPTS.realistic },
  { id: 'fantasy', label: '奇幻插画', icon: '🧙', prompt: STYLE_PROMPTS.fantasy },
  { id: 'architecture', label: '建筑概念', icon: '🏛️', prompt: STYLE_PROMPTS.architecture },
  { id: 'ink_wash', label: '国风水墨', icon: '🖌️', prompt: STYLE_PROMPTS.ink_wash },
]

export interface EngineOption {
  id: AIEngine
  label: string
  icon: string
  speed: string
  quality: string
  note: string
}

export const ENGINE_OPTIONS: EngineOption[] = [
  { id: 'huggingface', label: 'HuggingFace SDXL', icon: '🤗', speed: '快', quality: '良好', note: '免费，速度快' },
  { id: 'openai', label: 'OpenAI DALL-E 3', icon: '🌐', speed: '中', quality: '优秀', note: '质量高，需 API Key' },
  { id: 'stability', label: 'Stability AI', icon: '🎯', speed: '中', quality: '高质量', note: 'SD 3.5，细节丰富' },
  { id: 'replicate', label: 'Replicate FLUX', icon: '⚡', speed: '快', quality: '高质量', note: 'FLUX.1，开源模型' },
  { id: 'gemini', label: 'Google Imagen 3', icon: '🔮', speed: '中', quality: '照片级', note: '写实效果顶尖' },
]

export interface GenerateResult {
  imageUrl: string
  imageData?: string
}

/**
 * Dispatches image generation to the chosen AI engine.
 */
export async function generateImage(
  prompt: string,
  styleId: string,
  engine: AIEngine,
  quality?: ImageQuality
): Promise<GenerateResult> {
  const stylePrompt = STYLE_PROMPTS[styleId] ?? ''
  const res = await axios.post<GenerateResult>('/api/generate', {
    prompt,
    style: stylePrompt,
    engine,
    quality,
  })
  return res.data
}
