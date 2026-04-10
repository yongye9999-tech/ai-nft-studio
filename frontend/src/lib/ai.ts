// src/lib/ai.ts — AI image generation utilities for AI+NFT Studio
// Wraps the /api/generate route and defines style prompt mappings for 6 styles.

/** Available art styles and their prompt enhancements */
export const STYLE_MAP: Record<string, string> = {
  cyberpunk:
    "cyberpunk aesthetic, neon lights, futuristic cityscape, rain, dark atmosphere, highly detailed, cinematic lighting, 8K",
  watercolor:
    "watercolor painting, soft brush strokes, delicate colors, wet paper texture, artistic, gentle gradients",
  oil_painting:
    "oil painting, rich impasto texture, masterful brushwork, gallery quality, Rembrandt lighting, chiaroscuro",
  pixel_art:
    "pixel art, 8-bit retro style, crisp pixels, limited color palette, video game aesthetic, nostalgic",
  anime:
    "anime illustration, manga style, clean line art, vibrant colors, expressive characters, studio Ghibli inspired",
  "3d_render":
    "photorealistic 3D render, octane render, subsurface scattering, ray tracing, volumetric lighting, 8K UHD",
};

export type Engine = "huggingface" | "openai";

interface GenerateResult {
  imageUrl?: string;
  imageBase64?: string;
  engine: Engine;
}

/**
 * Call the /api/generate route with HuggingFace engine (Stable Diffusion XL).
 * Returns a base64-encoded PNG.
 */
export async function generateWithHuggingFace(
  prompt: string,
  style: string
): Promise<string> {
  const result = await callGenerateAPI(prompt, style, "huggingface");
  if (result.imageBase64) {
    return `data:image/png;base64,${result.imageBase64}`;
  }
  throw new Error("No image data returned from HuggingFace");
}

/**
 * Call the /api/generate route with OpenAI engine (DALL-E 3).
 * Returns a temporary URL to the generated image.
 */
export async function generateWithOpenAI(
  prompt: string,
  style: string
): Promise<string> {
  const result = await callGenerateAPI(prompt, style, "openai");
  if (result.imageUrl) return result.imageUrl;
  throw new Error("No image URL returned from OpenAI");
}

/**
 * Unified generate function — auto-selects engine.
 * Returns either a data: URL (HuggingFace) or https URL (OpenAI).
 */
export async function generate(
  prompt: string,
  style: string,
  engine: Engine = "huggingface"
): Promise<string> {
  if (engine === "openai") return generateWithOpenAI(prompt, style);
  return generateWithHuggingFace(prompt, style);
}

// ── Internal helper ───────────────────────────────────────────

async function callGenerateAPI(
  prompt: string,
  style: string,
  engine: Engine
): Promise<GenerateResult> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style, engine }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Generation failed: ${res.status}`);
  }

  return res.json() as Promise<GenerateResult>;
}
