/**
 * AI Engine configurations for image generation
 */

export interface AIStyle {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
}

export interface AIEngine {
  id: string;
  name: string;
  desc: string;
  free: boolean;
  model?: string;
}

/**
 * Available AI art styles
 */
export const AI_STYLES: AIStyle[] = [
  {
    id: "cyberpunk",
    name: "赛博朋克",
    emoji: "🤖",
    prompt: "cyberpunk style, neon lights, futuristic city, dark atmosphere, highly detailed",
  },
  {
    id: "watercolor",
    name: "水彩",
    emoji: "🎨",
    prompt: "watercolor painting style, soft colors, artistic, fluid brushstrokes, beautiful",
  },
  {
    id: "oil_painting",
    name: "油画",
    emoji: "🖼️",
    prompt: "oil painting style, classical art, rich textures, masterpiece, gallery quality",
  },
  {
    id: "pixel_art",
    name: "像素艺术",
    emoji: "👾",
    prompt: "pixel art style, 8-bit retro, colorful, game character, detailed pixel work",
  },
  {
    id: "anime",
    name: "日本动漫",
    emoji: "⛩️",
    prompt: "anime style, Japanese animation, vibrant colors, manga aesthetic, high quality",
  },
  {
    id: "3d_render",
    name: "3D渲染",
    emoji: "💎",
    prompt: "3D render style, octane render, photorealistic, ray tracing, studio lighting",
  },
];

/**
 * Available AI engine options
 */
export const AI_ENGINES: AIEngine[] = [
  {
    id: "huggingface",
    name: "HuggingFace",
    desc: "Stable Diffusion XL",
    free: true,
    model: "stabilityai/stable-diffusion-xl-base-1.0",
  },
  {
    id: "openai",
    name: "OpenAI",
    desc: "DALL-E 3 (HD)",
    free: false,
    model: "dall-e-3",
  },
];

/**
 * Get the style prompt enhancement for a given style ID
 */
export function getStylePrompt(styleId: string): string {
  const style = AI_STYLES.find((s) => s.id === styleId);
  return style?.prompt || "";
}

/**
 * Build a full generation prompt with style enhancement
 */
export function buildFullPrompt(basePrompt: string, styleId: string): string {
  const stylePrompt = getStylePrompt(styleId);
  if (stylePrompt) {
    return `${basePrompt}, ${stylePrompt}`;
  }
  return basePrompt;
}

/**
 * Generate image via API route
 */
export async function generateImage(
  prompt: string,
  style: string,
  engine: string
): Promise<{ imageUrl: string; prompt: string }> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style, engine }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "AI generation failed");
  }

  return await res.json();
}
