/** Maps style IDs to extra prompt modifiers */
const STYLE_MODIFIERS: Record<string, string> = {
  cyberpunk:
    "cyberpunk style, neon lights, futuristic dystopian city, dark rain-soaked streets, highly detailed",
  watercolor:
    "watercolor painting style, soft pastel colors, artistic brushstrokes, dreamy atmosphere",
  oilpainting:
    "oil painting style, classical fine art, rich textures, warm palette, museum quality",
  pixelart:
    "pixel art style, 8-bit retro aesthetic, vibrant limited palette, crisp pixels",
  anime:
    "Japanese anime style, vibrant colors, sharp clean lines, expressive characters, manga-inspired",
  "3d":
    "3D render, octane render, photorealistic, dramatic studio lighting, ultra-detailed",
};

function buildFullPrompt(prompt: string, style: string): string {
  const modifier = STYLE_MODIFIERS[style] ?? "";
  return modifier ? `${prompt}, ${modifier}` : prompt;
}

/**
 * Generate an image using HuggingFace Inference API (server-side use).
 * Returns the raw image as a Blob.
 */
export async function generateWithHuggingFace(
  prompt: string,
  style: string
): Promise<Blob> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");

  const fullPrompt = buildFullPrompt(prompt, style);
  const model = "stabilityai/stable-diffusion-xl-base-1.0";

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: fullPrompt }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HuggingFace API error (${res.status}): ${text}`);
  }

  return res.blob();
}

/**
 * Generate an image using OpenAI DALL-E 3 (server-side use).
 * Returns the public image URL.
 */
export async function generateWithOpenAI(
  prompt: string,
  style: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const fullPrompt = buildFullPrompt(prompt, style);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(err)}`);
  }

  const data = (await res.json()) as { data: Array<{ url: string }> };
  const url = data.data[0]?.url;
  if (!url) throw new Error("No image URL returned from OpenAI");
  return url;
}
