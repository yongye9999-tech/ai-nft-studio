import { NextRequest, NextResponse } from "next/server";
import { uploadImageToIPFS, uploadMetadataToIPFS } from "@/lib/ipfs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, name, description } = body as {
      imageData: string;
      name: string;
      description: string;
    };

    if (!imageData || typeof imageData !== "string") {
      return NextResponse.json({ error: "imageData is required" }, { status: 400 });
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Step 1: Upload image to IPFS
    const imageURI = await uploadImageToIPFS(imageData);

    // Step 2: Build and upload metadata
    const attributes = [
      { trait_type: "Created By", value: "AI+NFT Studio" },
      { trait_type: "Generator", value: "Stable Diffusion XL / DALL-E 3" },
      { trait_type: "Created At", value: new Date().toISOString() },
    ];

    const tokenURI = await uploadMetadataToIPFS(
      name,
      description || "",
      imageURI,
      attributes
    );

    return NextResponse.json({ success: true, tokenURI, imageURI });
  } catch (error: unknown) {
    console.error("Upload API error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
