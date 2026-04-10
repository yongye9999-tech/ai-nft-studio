// src/app/api/upload/route.ts — API route for uploading NFT image and metadata to IPFS via Pinata
// Receives FormData with image + name/description/attributes, returns tokenURI and imageURI.

import { NextRequest, NextResponse } from "next/server";

const PINATA_API_URL = "https://api.pinata.cloud";

export async function POST(req: NextRequest) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "PINATA_JWT not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string) || "";
    const attributesRaw = (formData.get("attributes") as string) || "[]";

    if (!imageFile) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let attributes: Array<{ trait_type: string; value: string }> = [];
    try {
      attributes = JSON.parse(attributesRaw);
    } catch {
      attributes = [];
    }

    // ── Step 1: Upload image to Pinata ───────────────────────
    const imageIpfsHash = await uploadFileToPinata(imageFile, jwt, `${name}-image.png`);
    const imageURI = `ipfs://${imageIpfsHash}`;

    // ── Step 2: Create and upload metadata JSON ───────────────
    const metadata = {
      name,
      description,
      image: imageURI,
      attributes: [
        ...attributes,
        { trait_type: "Platform", value: "AI+NFT Studio" },
        { trait_type: "Created", value: new Date().toISOString().split("T")[0] },
      ],
    };

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    });
    const metadataFile = new File([metadataBlob], `${name}-metadata.json`, {
      type: "application/json",
    });

    const metadataIpfsHash = await uploadFileToPinata(metadataFile, jwt, `${name}-metadata.json`);
    const tokenURI = `ipfs://${metadataIpfsHash}`;

    return NextResponse.json({
      tokenURI,
      imageURI,
      imageHash: imageIpfsHash,
      metadataHash: metadataIpfsHash,
    });
  } catch (err: unknown) {
    console.error("[upload] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

// ── Helper: upload a File to Pinata via pinFileToIPFS ─────────
async function uploadFileToPinata(file: File, jwt: string, fileName: string): Promise<string> {
  const body = new FormData();
  body.append("file", file, fileName);
  body.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName })
  );
  body.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.IpfsHash as string;
}
