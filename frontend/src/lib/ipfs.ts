import axios from 'axios'

export interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes?: { trait_type: string; value: string | number }[]
  created_by?: string
  created_at?: string
}

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'
const FALLBACK_GATEWAY = 'https://ipfs.io/ipfs/'

/**
 * Converts an IPFS URI (ipfs://CID) or bare CID to a resolvable HTTP URL.
 */
export function getIPFSUrl(ipfsUriOrCid: string): string {
  if (!ipfsUriOrCid) return ''
  if (ipfsUriOrCid.startsWith('ipfs://')) {
    const cid = ipfsUriOrCid.replace('ipfs://', '')
    return `${IPFS_GATEWAY}${cid}`
  }
  if (ipfsUriOrCid.startsWith('http')) return ipfsUriOrCid
  return `${IPFS_GATEWAY}${ipfsUriOrCid}`
}

/**
 * Converts an IPFS URI to a fallback gateway URL.
 */
export function getIPFSFallbackUrl(ipfsUri: string): string {
  const cid = ipfsUri.replace('ipfs://', '')
  return `${FALLBACK_GATEWAY}${cid}`
}

/**
 * Uploads a base64-encoded image to IPFS via the Next.js upload API route.
 * @param imageData  Base64 image data (with or without the data URI prefix).
 * @returns          IPFS URI in the form ipfs://CID
 */
export async function uploadImage(imageData: string): Promise<string> {
  const res = await axios.post<{ imageUri: string; metadataUri: string }>('/api/upload', {
    imageData,
    name: 'nft-image',
    description: 'NFT image uploaded via AI+NFT Studio',
  })
  return res.data.imageUri
}

/**
 * Uploads an NFT metadata object to IPFS via the Next.js upload API route.
 * @param metadata  NFTMetadata object.
 * @returns         IPFS URI in the form ipfs://CID
 */
export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  const res = await axios.post<{ metadataUri: string; imageUri: string }>('/api/upload', {
    imageData: '',
    name: metadata.name,
    description: metadata.description,
    attributes: metadata.attributes,
    // Pass the already-uploaded image URI so the API route skips re-uploading the image
    imageUri: metadata.image,
  })
  return res.data.metadataUri
}
