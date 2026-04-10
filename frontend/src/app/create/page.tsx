import { AIGenerator } from "@/components/AIGenerator";

export default function CreatePage() {
  return (
    <div className="min-h-screen pt-20 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            🎨 Create AI Art
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Describe your vision, choose a style, and let AI generate stunning artwork.
            Then mint it as an NFT with one click.
          </p>
        </div>

        {/* AI Generator */}
        <AIGenerator />

        {/* Tips */}
        <div className="mt-10 card p-6">
          <h3 className="text-white font-semibold mb-3">💡 Prompt Tips</h3>
          <ul className="text-gray-400 text-sm space-y-1.5 list-disc list-inside">
            <li>Be descriptive: &quot;a neon cyberpunk dragon in a futuristic city at night&quot;</li>
            <li>Add atmosphere: &quot;dramatic lighting, 8K resolution, highly detailed&quot;</li>
            <li>Specify medium: &quot;digital painting, oil on canvas, watercolor illustration&quot;</li>
            <li>Include mood: &quot;ethereal, mysterious, vibrant, melancholic&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
