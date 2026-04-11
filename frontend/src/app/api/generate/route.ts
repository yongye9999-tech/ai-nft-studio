import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  cyberpunk: "cyberpunk style, neon lights, futuristic city, dark atmosphere, highly detailed",
  watercolor: "watercolor painting style, soft colors, artistic, fluid brushstrokes, beautiful",
  oil_painting: "oil painting style, classical art, rich textures, masterpiece, gallery quality",
  pixel_art: "pixel art style, 8-bit retro, colorful, game character, detailed pixel work",
  anime: "anime style, Japanese animation, vibrant colors, manga aesthetic, high quality",
  "3d_render": "3D render style, octane render, photorealistic, ray tracing, studio lighting",
};

async function generateWithHuggingFace(prompt: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HuggingFace API key not configured");

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
          negative_prompt: "blurry, low quality, watermark, text, ugly, deformed",
          num_inference_steps: 30,
          guidance_scale: 7.5,
          width: 1024,
          height: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace API error: ${error}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "vivid",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.data[0].url;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style, engine } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const styleEnhancement = STYLE_PROMPTS[style] || "";
    const fullPrompt = styleEnhancement
      ? `${prompt}, ${styleEnhancement}`
      : prompt;

    let imageUrl: string;

    if (engine === "openai") {
      imageUrl = await generateWithOpenAI(fullPrompt);
    } else {
      // Default: HuggingFace
      imageUrl = await generateWithHuggingFace(fullPrompt);
    }

    return NextResponse.json({
      imageUrl,
      prompt: fullPrompt,
      engine: engine || "huggingface",
      style: style || "default",
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
