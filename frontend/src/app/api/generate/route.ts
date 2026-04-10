// src/app/api/generate/route.ts — API route for AI image generation
// Supports HuggingFace (Stable Diffusion XL) and OpenAI (DALL-E 3) engines.

import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  cyberpunk: "cyberpunk aesthetic, neon lights, futuristic cityscape, highly detailed, cinematic lighting",
  watercolor: "watercolor painting style, soft brush strokes, delicate colors, artistic, paper texture",
  oil_painting: "oil painting style, rich textures, masterful brushwork, gallery quality, Renaissance influence",
  pixel_art: "pixel art style, 8-bit, retro video game aesthetic, crisp pixels, vibrant colors",
  anime: "anime style, manga illustration, clean line art, vibrant colors, Japanese animation aesthetic",
  "3d_render": "3D render, octane render, photorealistic, subsurface scattering, ray tracing, 8K resolution",
};

const NEGATIVE_PROMPT =
  "blurry, low quality, watermark, signature, text, bad anatomy, ugly, deformed, nsfw";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style = "cyberpunk", engine = "huggingface" } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const styleEnhancement = STYLE_PROMPTS[style] || STYLE_PROMPTS.cyberpunk;
    const fullPrompt = `${prompt}, ${styleEnhancement}`;

    if (engine === "openai") {
      return await generateWithOpenAI(fullPrompt);
    }

    return await generateWithHuggingFace(fullPrompt);
  } catch (err: unknown) {
    console.error("[generate] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ── HuggingFace Inference API ─────────────────────────────────
async function generateWithHuggingFace(prompt: string): Promise<NextResponse> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HUGGINGFACE_API_KEY not configured" }, { status: 500 });
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: NEGATIVE_PROMPT,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          width: 1024,
          height: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    // Model may be loading; return a helpful message
    if (response.status === 503) {
      return NextResponse.json(
        { error: "模型正在加载中（约20-30秒），请稍后重试" },
        { status: 503 }
      );
    }
    throw new Error(`HuggingFace API error: ${response.status} ${errText}`);
  }

  const imageBuffer = await response.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString("base64");

  return NextResponse.json({ imageBase64, engine: "huggingface" });
}

// ── OpenAI DALL-E 3 ───────────────────────────────────────────
async function generateWithOpenAI(prompt: string): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`OpenAI API error: ${errData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const imageUrl: string = data.data[0].url;

  return NextResponse.json({ imageUrl, engine: "openai" });
}
