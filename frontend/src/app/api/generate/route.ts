import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, engine } = await req.json() as {
      prompt: string;
      style: string;
      engine: "huggingface" | "openai";
    };

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const stylePromptMap: Record<string, string> = {
      cyberpunk: "cyberpunk style, neon lights, futuristic city, dark atmosphere, highly detailed",
      watercolor: "watercolor painting style, soft colors, artistic, beautiful brushstrokes",
      oilpainting: "oil painting style, classical art, rich textures, museum quality",
      pixelart: "pixel art style, 8-bit, retro game aesthetic, vibrant colors",
      anime: "Japanese anime style, vibrant colors, clean lines, manga-inspired",
      "3d": "3D render, photorealistic, high quality, octane render, dramatic lighting",
    };

    const styleModifier = stylePromptMap[style] || "";
    const fullPrompt = `${prompt}, ${styleModifier}`.trim();

    if (engine === "openai") {
      return await generateWithOpenAI(fullPrompt);
    }
    return await generateWithHuggingFace(fullPrompt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateWithHuggingFace(prompt: string) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HUGGINGFACE_API_KEY not configured" }, { status: 500 });
  }

  const model = "stabilityai/stable-diffusion-xl-base-1.0";
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: `HuggingFace API error: ${errText}` },
      { status: response.status }
    );
  }

  const imageBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return NextResponse.json({ imageBase64: `data:image/png;base64,${base64}` });
}

async function generateWithOpenAI(prompt: string) {
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
    }),
  });

  if (!response.ok) {
    const errJson = await response.json();
    return NextResponse.json(
      { error: `OpenAI API error: ${JSON.stringify(errJson)}` },
      { status: response.status }
    );
  }

  const data = await response.json() as { data: Array<{ url: string }> };
  const imageUrl = data.data[0]?.url;
  if (!imageUrl) {
    return NextResponse.json({ error: "No image URL returned from OpenAI" }, { status: 500 });
  }
  return NextResponse.json({ imageUrl });
}
