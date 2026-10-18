// src/components/AiCustomSceneDialog.tsx
import { useState } from "react";

interface AiCustomSceneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCity: string;
  weatherDesc?: string;
  onImageGenerated: (imageUrl: string, city: string) => void;
}

const PRESET_IDEAS = [
  "Golden sunset glow with warm reflections",
  "Moody mist rolling over the historic bridge",
  "Peaceful morning canals with wooden boats",
  "Rain-soaked streets with neon reflections",
  "Cherry blossoms in soft atmospheric breeze",
];

export function AiCustomSceneDialog({
  isOpen,
  onClose,
  defaultCity,
  weatherDesc,
  onImageGenerated,
}: AiCustomSceneDialogProps) {
  const [city, setCity] = useState(defaultCity || "");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !prompt.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate-watercolor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          userPrompt: prompt.trim(),
          weatherDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate image");
      }

      onImageGenerated(data.imageUrl, city.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect to AI Gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-6 text-white shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors text-lg"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="text-lg font-bold">Generate AI Watercolor</h3>
            <p className="text-xs text-slate-400">Powered by Lovable AI Gateway</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">City or Landmark</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ratchaburi, Tokyo, Venice"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Describe the watercolor scene
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Floating wooden market boats along Mae Klong river at sunrise..."
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-hidden resize-none"
              required
            />
          </div>

          {/* Quick Idea Chips */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">Inspiration ideas:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_IDEAS.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-white/15 bg-transparent py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Painting canvas...</span>
                </>
              ) : (
                <>
                  <span>🎨</span>
                  <span>Generate Art</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
