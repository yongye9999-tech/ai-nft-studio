import { NextRequest, NextResponse } from "next/server";

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: NFTAttribute[];
  external_url?: string;
}

async function uploadImageToPinata(imageUrl: string, name: string): Promise<string> {
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error("Pinata API keys not configured");
  }

  let imageBuffer: Buffer;

  if (imageUrl.startsWith("data:")) {
    // Base64 image from our own AI generation endpoint — safe to use directly
    const base64Data = imageUrl.split(",")[1];
    imageBuffer = Buffer.from(base64Data, "base64");
  } else if (imageUrl.startsWith("https://")) {
    // Only allow external URLs from trusted OpenAI CDN hosts
    const allowedHosts = [
      "oaidalleapiprodscus.blob.core.windows.net",
      "oaidallep.blob.core.windows.net",
    ];
    const parsedUrl = new URL(imageUrl);
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      throw new Error("Image URL host not allowed");
    }
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Failed to fetch image");
    const arrayBuffer = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error("Invalid image URL format");
  }

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
  formData.append("file", blob, `${name.replace(/\s+/g, "_")}.jpg`);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: `AI NFT Image - ${name}` })
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error("Pinata API keys not configured");
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `AI NFT Metadata - ${metadata.name}`,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata metadata upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, name, description, attributes } = body;

    if (!imageUrl || !name) {
      return NextResponse.json(
        { error: "imageUrl and name are required" },
        { status: 400 }
      );
    }

    // Step 1: Upload image to IPFS
    const imageIpfsUri = await uploadImageToPinata(imageUrl, name);

    // Step 2: Build metadata
    const metadata: NFTMetadata = {
      name,
      description: description || `AI-generated NFT: ${name}`,
      image: imageIpfsUri,
      attributes: attributes || [],
      external_url: "https://ai-nft-studio.xyz",
    };

    // Step 3: Upload metadata to IPFS
    const metadataUri = await uploadMetadataToPinata(metadata);

    return NextResponse.json({
      imageUri: imageIpfsUri,
      metadataUri,
      metadata,
    });
  } catch (error: unknown) {
    console.error("IPFS upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
