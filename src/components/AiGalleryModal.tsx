// src/components/AiGalleryModal.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getAllAvailableArtworks } from "@/lib/aiWatercolorGenerator";

interface AiGalleryModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  city?: string;
  cityName?: string;
  country?: string;
  weatherCode?: number;
  weatherDesc?: string;
  activeBackground?: string;
  activeBg?: string | null;
  onSelectBackground: (url: string) => void;
}

interface SavedArtItem {
  id: string;
  url: string;
  label: string;
  date?: string;
}

const STORAGE_SAVED_KEY = "weather:custom-art-saved";

export function AiGalleryModal(props: AiGalleryModalProps) {
  const { t } = useTranslation();
  const isOpen = props.isOpen ?? props.open ?? false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    props.onClose?.();
    props.onOpenChange?.(false);
  };

  const activeCity = props.city || props.cityName || "Current Location";
  const activeBackground = props.activeBackground || props.activeBg || "";

  const [activeTab, setActiveTab] = useState<"curated" | "saved" | "generate">("curated");
  const [curatedList, setCuratedList] = useState<{ url: string; title: string }[]>([]);
  const [savedArts, setSavedArts] = useState<SavedArtItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load curated artworks and persistent saved artwork collection
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

      // Load curated landmarks and weather scenes
      try {
        const rawList = getAllAvailableArtworks(
          activeCity,
          props.weatherCode ?? 0,
          props.weatherDesc ?? "clear",
          props.country
        );

        // Normalize string URLs to object structure
        const normalized = (rawList || []).map((item: any, idx: number) => {
          if (typeof item === "string") {
            return {
              url: item,
              title: idx === 0 ? `${activeCity} Landmark` : `${activeCity} View #${idx + 1}`,
            };
          }
          return {
            url: item?.url || "",
            title: item?.title || `${activeCity} View #${idx + 1}`,
          };
        }).filter((item) => Boolean(item.url));

        setCuratedList(normalized);
      } catch {
        setCuratedList([]);
      }

      // Load saved artworks from localStorage
      try {
        const raw = localStorage.getItem(STORAGE_SAVED_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSavedArts(parsed);
          }
        }
      } catch {
        setSavedArts([]);
      }
    }
  }, [isOpen, activeCity, props.weatherCode, props.weatherDesc, props.country]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    props.onSelectBackground(url);
    handleClose();
  };

  const handleClearSaved = () => {
    if (window.confirm("Remove all saved artworks from your gallery?")) {
      localStorage.removeItem(STORAGE_SAVED_KEY);
      setSavedArts([]);
    }
  };

  const handleDeleteSingleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedArts.filter((item) => item.id !== id);
    setSavedArts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSaveToCollection = (url: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!url) return;

    if (savedArts.some((art) => art.url === url)) {
      return; // Already saved
    }

    const newArt: SavedArtItem = {
      id: Date.now().toString(),
      url,
      label,
      date: new Date().toLocaleDateString(),
    };

    const updated = [newArt, ...savedArts.slice(0, 19)];
    setSavedArts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Upload custom user image file
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        const newArt: SavedArtItem = {
          id: Date.now().toString(),
          url: result,
          label: `${activeCity} — ${file.name.replace(/\.[^/.]+$/, "")}`,
          date: new Date().toLocaleDateString(),
        };

        const updated = [newArt, ...savedArts.slice(0, 14)];
        setSavedArts(updated);
        try {
          localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
        } catch {}

        props.onSelectBackground(result);
        setActiveTab("saved");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Generate new watercolor via AI Gateway
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/generate-watercolor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: activeCity,
          userPrompt: prompt.trim(),
          prompt: prompt.trim(),
          weatherDesc: props.weatherDesc,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || "AI generation failed. Please try again.");
      }

      const newArt: SavedArtItem = {
        id: Date.now().toString(),
        url: data.imageUrl,
        label: `${activeCity} — ${prompt.trim()}`,
        date: new Date().toLocaleDateString(),
      };

      const updated = [newArt, ...savedArts.filter((item) => item.url !== data.imageUrl).slice(0, 19)];
      setSavedArts(updated);
      try {
        localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
      } catch {}

      props.onSelectBackground(data.imageUrl);
      setPrompt("");
      handleClose();
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setErrorMessage(err?.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">{t("gallery_title", "AI & Landmark Art Gallery")}</h3>
              <p className="text-[11px] text-muted-foreground">{activeCity}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/40 px-4 gap-2 pt-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab("curated")}
            className={`pb-2 px-3 border-b-2 transition ${
              activeTab === "curated"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_curated", "Curated Landmarks")} ({curatedList.length})
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-2 px-3 border-b-2 transition ${
              activeTab === "saved"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_saved", "Saved & Created")} ({savedArts.length})
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`pb-2 px-3 border-b-2 transition ${
              activeTab === "generate"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            ✨ {t("tab_generate", "Generate with AI")}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {/* TAB 1: CURATED LANDMARKS */}
          {activeTab === "curated" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {curatedList.length} scenes available for {activeCity}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("gallery_reset_art", "Reset to Weather Art")}
                </button>
              </div>

              {curatedList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  No curated scenes found for this location yet. Try the <strong className="text-foreground">Generate with AI</strong> tab!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {curatedList.map((art, idx) => {
                    const isCurActive = activeBackground === art.url;
                    const isAlreadySaved = savedArts.some((s) => s.url === art.url);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(art.url)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-video transition-all shadow-xs ${
                          isCurActive
                            ? "border-primary ring-2 ring-primary/50 shadow-md"
                            : "border-border hover:border-primary/60 hover:shadow"
                        }`}
                      >
                        <img
                          src={art.url}
                          alt={art.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        <span className="absolute bottom-2 left-2 right-2 text-[11px] font-medium text-white truncate drop-shadow-xs">
                          {art.title}
                        </span>

                        {isCurActive && (
                          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold shadow">
                            {t("gallery_active_badge", "Active")}
                          </span>
                        )}

                        {/* Bookmark to saved button */}
                        <button
                          type="button"
                          onClick={(e) => handleSaveToCollection(art.url, art.title, e)}
                          title={isAlreadySaved ? "Saved" : "Save to my collection"}
                          className={`absolute top-2 right-2 p-1 rounded-full text-xs transition backdrop-blur-md ${
                            isAlreadySaved
                              ? "bg-amber-500/80 text-white"
                              : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60"
                          }`}
                        >
                          {isAlreadySaved ? "★" : "☆"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED & CREATED ART */}
          {activeTab === "saved" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {savedArts.length} saved artworks
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <span>📤</span> {t("gallery_upload_label", "Upload custom image")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {savedArts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSaved}
                      className="text-xs text-destructive hover:underline ml-2"
                    >
                      {t("gallery_clear_saved", "Clear All")}
                    </button>
                  )}
                </div>
              </div>

              {savedArts.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20">
                  <span className="text-3xl block mb-2">🖼️</span>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("gallery_empty_saved", "No saved art yet. Generate one with AI or upload a picture!")}
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("generate")}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                    >
                      {t("tab_generate", "Generate with AI")}
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted"
                    >
                      {t("gallery_upload_label", "Upload image")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedArts.map((art) => {
                    const isCurActive = activeBackground === art.url;

                    return (
                      <div
                        key={art.id}
                        onClick={() => handleSelect(art.url)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                          isCurActive
                            ? "border-primary ring-2 ring-primary/50 shadow-md"
                            : "border-border hover:border-primary/60"
                        }`}
                      >
                        <img
                          src={art.url}
                          alt={art.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        <span className="absolute bottom-2 left-2 right-2 text-[11px] font-medium text-white truncate drop-shadow-xs">
                          {art.label}
                        </span>

                        {isCurActive && (
                          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold shadow">
                            {t("gallery_active_badge", "Active")}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleSaved(art.id, e)}
                          title="Delete saved art"
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-destructive text-[10px] transition"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERATE WITH AI */}
          {activeTab === "generate" && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  {t("gallery_prompt_label", "Describe the watercolor scene")} ({activeCity})
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("gallery_prompt_placeholder", "e.g., misty bamboo forest at sunrise, vibrant watercolor style")}
                  rows={3}
                  className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-2">
                  {t("gallery_preset_inspiration", "Inspiration ideas:")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "golden temple reflecting in morning rain",
                    "misty old town market under soft clouds",
                    "vibrant sunset skyline in watercolor wash",
                    "snowy mountain pass with dramatic clouds",
                    "peaceful canal boats at dusk with warm lanterns",
                  ].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setPrompt(idea)}
                      className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border transition"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>{t("gallery_btn_generating", "Painting watercolor scene…")}</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>{t("gallery_btn_generate", "Generate & Set Background")}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
