import { NextRequest, NextResponse } from "next/server";
import { generateImage, type AIEngine } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style, engine } = body as {
      prompt: string;
      style: string;
      engine: AIEngine;
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt is too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    const image = await generateImage({
      prompt: prompt.trim(),
      style: style || "Photorealistic",
      engine: engine || "huggingface",
    });

    return NextResponse.json({ success: true, image });
  } catch (error: unknown) {
    console.error("Generate API error:", error);
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
