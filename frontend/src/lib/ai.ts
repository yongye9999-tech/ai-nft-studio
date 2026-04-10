/**
 * AI image generation utilities.
 * Supports HuggingFace Inference API and OpenAI DALL-E 3.
 */

export type AIEngine = "huggingface" | "openai";

export interface GenerateOptions {
  prompt: string;
  style: string;
  engine?: AIEngine;
}

/**
 * Generate an image using the specified AI engine.
 * Returns a base64-encoded PNG string (no data URL prefix).
 */
export async function generateImage({
  prompt,
  style,
  engine = "huggingface",
}: GenerateOptions): Promise<string> {
  const styledPrompt = `${style} style, ${prompt}`;

  if (engine === "openai") {
    return generateWithOpenAI(styledPrompt);
  }

  return generateWithHuggingFace(styledPrompt);
}

/**
 * Generate image using HuggingFace Stable Diffusion XL.
 */
async function generateWithHuggingFace(prompt: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
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
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} ${errorText}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return base64;
}

/**
 * Generate image using OpenAI DALL-E 3.
 */
async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
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
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const base64 = data.data[0]?.b64_json;

  if (!base64) {
    throw new Error("No image data returned from OpenAI");
  }

  return base64;
}
