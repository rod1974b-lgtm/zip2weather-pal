// src/components/AiGalleryModal.tsx
import { useState, useEffect, useRef } from "react";
import {
  getAllAvailableArtworks,
  WEATHER_WATERCOLORS,
} from "@/lib/aiWatercolorGenerator";

interface AiGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  country?: string;
  weatherCode?: number;
  weatherDesc?: string;
  activeBackground: string | null;
  onSelectBackground: (url: string | null) => void;
}

const PRESET_IDEAS = [
  "Golden sunset glow with warm reflections",
  "Moody mist rolling over the historic bridge",
  "Peaceful morning canals with wooden boats",
  "Rain-soaked streets with neon reflections",
  "Cherry blossoms in soft atmospheric breeze",
  "Dramatic lightning over mountain peaks",
];

export function AiGalleryModal({
  isOpen,
  onClose,
  city,
  country,
  weatherCode = 0,
  weatherDesc = "Clear sky",
  activeBackground,
  onSelectBackground,
}: AiGalleryModalProps) {
  const [tab, setTab] = useState<"gallery" | "generate" | "saved">("gallery");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedGallery, setSavedGallery] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved AI backgrounds from localStorage history
  useEffect(() => {
    try {
      const stored = localStorage.getItem("weather:ai-gallery-history");
      if (stored) {
        setSavedGallery(JSON.parse(stored));
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const targetCity = city?.trim() || "Local Scenery";

  // Retrieve curated artworks with all required parameters
  const cityArtworks = getAllAvailableArtworks(
    targetCity,
    weatherCode,
    typeof weatherDesc === "string" ? weatherDesc : "Clear sky",
    country
  );

  // Atmospheric weather backgrounds flattened across all conditions
  const weatherArtworks = Object.values(WEATHER_WATERCOLORS).flat();

  const handleSelect = (url: string | null) => {
    onSelectBackground(url);
    onClose();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCity || !prompt.trim() || generating) return;

    setGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate-watercolor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: targetCity,
          userPrompt: prompt.trim(),
          weatherDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate image");
      }

      const newImageUrl = data.imageUrl;

      // Save to city custom background
      try {
        localStorage.setItem(`weather:custom-bg:${targetCity.toLowerCase().trim()}`, newImageUrl);
      } catch (err) {
        console.warn("Storage quota exceeded:", err);
      }

      // Add to persistent AI Gallery history
      try {
        const nextHistory = [newImageUrl, ...savedGallery.filter((u) => u !== newImageUrl)].slice(0, 24);
        localStorage.setItem("weather:ai-gallery-history", JSON.stringify(nextHistory));
        setSavedGallery(nextHistory);
      } catch {}

      onSelectBackground(newImageUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect to AI Gateway.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          try {
            localStorage.setItem(`weather:custom-bg:${targetCity.toLowerCase().trim()}`, dataUrl);
            const nextHistory = [dataUrl, ...savedGallery.filter((u) => u !== dataUrl)].slice(0, 24);
            localStorage.setItem("weather:ai-gallery-history", JSON.stringify(nextHistory));
            setSavedGallery(nextHistory);
          } catch (err) {
            console.warn("Storage quota exceeded:", err);
          }
          onSelectBackground(dataUrl);
          onClose();
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-2xl rounded-2xl border border-white/20 bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Hidden photo file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">AI Background Gallery</h2>
              <p className="text-xs text-slate-400">
                Custom scenery for <span className="text-white font-medium">{targetCity}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-2.5 bg-black/20 text-xs">
          <button
            type="button"
            onClick={() => setTab("gallery")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              tab === "gallery"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            🖼️ City Artworks ({cityArtworks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("saved")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              tab === "saved"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            ⭐ Saved & Created ({savedGallery.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("generate")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              tab === "generate"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            ✨ Generate with AI
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "gallery" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Artworks for {targetCity}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tap any image to set as your live hero card background
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelect(null)}
                    className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    🔄 Auto Weather
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    📷 Upload Photo
                  </button>
                </div>
              </div>

              {cityArtworks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No curated local landmarks yet. Check out the atmospheric presets below or generate a custom scene!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cityArtworks.map((url, idx) => {
                    const isActive = activeBackground === url;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(url)}
                        className={`group relative aspect-16/10 cursor-pointer overflow-hidden rounded-xl border transition-all ${
                          isActive
                            ? "border-primary ring-2 ring-primary shadow-lg scale-[1.02]"
                            : "border-white/15 hover:border-white/40 hover:scale-[1.01]"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`${targetCity} landmark ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                        {isActive && (
                          <div className="absolute top-2 right-2 rounded-full bg-primary p-1 text-[10px] text-white shadow-sm">
                            ✓ Active
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 text-[11px] font-medium text-white truncate">
                          {targetCity} Art #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Atmospheric Weather Presets */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">
                  Atmospheric Weather Artworks
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {weatherArtworks.slice(0, 8).map((url, idx) => {
                    const isActive = activeBackground === url;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(url)}
                        className={`group relative aspect-16/10 cursor-pointer overflow-hidden rounded-lg border transition-all ${
                          isActive
                            ? "border-primary ring-2 ring-primary"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Atmosphere ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {isActive && (
                          <div className="absolute top-1.5 right-1.5 rounded-full bg-primary px-1 text-[9px] text-white">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "saved" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Saved & Custom AI Backgrounds
                  </h3>
                  <p className="text-xs text-slate-400">
                    History of scenes generated or uploaded across all your searches
                  </p>
                </div>
                {savedGallery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem("weather:ai-gallery-history");
                        setSavedGallery([]);
                      } catch {}
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {savedGallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-4xl mb-2 opacity-50">🖼️</span>
                  <p className="text-sm text-slate-300 font-medium">No saved backgrounds yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Generate custom watercolor scenes using the AI generator tab or upload your own photos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("generate")}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                  >
                    ✨ Generate First Scene
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedGallery.map((url, idx) => {
                    const isActive = activeBackground === url;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(url)}
                        className={`group relative aspect-16/10 cursor-pointer overflow-hidden rounded-xl border transition-all ${
                          isActive
                            ? "border-primary ring-2 ring-primary shadow-lg scale-[1.02]"
                            : "border-white/15 hover:border-white/40"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Saved art ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                        {isActive && (
                          <div className="absolute top-2 right-2 rounded-full bg-primary p-1 text-[10px] text-white shadow-sm">
                            ✓ Active
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-[11px] font-medium text-white truncate">
                          Saved Creation #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "generate" && (
            <div className="max-w-lg mx-auto py-2">
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target City
                  </label>
                  <input
                    type="text"
                    value={targetCity}
                    disabled
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Describe Your Desired Scene
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Traditional riverside temple at golden hour with soft misty water reflections..."
                    rows={3}
                    className="w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-hidden resize-none"
                    required
                  />
                </div>

                {/* Inspiration chips */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                    Quick Scene Inspiration:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IDEAS.map((idea, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(idea)}
                        className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:border-primary/50 hover:bg-primary/20 hover:text-white transition-all text-left"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-lg bg-red-500/20 border border-red-500/40 p-2.5 text-xs text-red-200">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-sm text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Creating Watercolor Scene...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate & Set Background</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
