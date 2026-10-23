// src/components/AiGalleryModal.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getAllAvailableArtworks } from "@/lib/aiWatercolorGenerator";

interface AiGalleryModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  city?: string;
  cityName?: string;
  activeBackground?: string;
  activeBg?: string;
  onSelectBackground: (url: string) => void;
}

const STORAGE_SAVED_KEY = "weather:custom-art-saved";

export function AiGalleryModal(props: AiGalleryModalProps) {
  const { t } = useTranslation();
  const isOpen = props.isOpen ?? props.open ?? false;
  const handleClose = () => {
    props.onClose?.();
    props.onOpenChange?.(false);
  };
  const activeCity = props.city || props.cityName || "Current City";
  const activeBackground = props.activeBackground || props.activeBg || "";

  const [activeTab, setActiveTab] = useState<"curated" | "saved" | "generate">("curated");
  const [curatedList, setCuratedList] = useState<any[]>([]);
  const [savedArts, setSavedArts] = useState<{ id: string; url: string; label: string }[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const list = getAllAvailableArtworks(activeCity);
        setCuratedList(list);
      } catch {
        setCuratedList([]);
      }
      try {
        const raw = localStorage.getItem(STORAGE_SAVED_KEY);
        if (raw) setSavedArts(JSON.parse(raw));
      } catch {
        setSavedArts([]);
      }
    }
  }, [isOpen, activeCity]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    props.onSelectBackground(url);
    handleClose();
  };

  const handleClearSaved = () => {
    localStorage.removeItem(STORAGE_SAVED_KEY);
    setSavedArts([]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate-watercolor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: activeCity,
          prompt: prompt.trim(),
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data?.imageUrl) {
        const newArt = {
          id: Date.now().toString(),
          url: data.imageUrl,
          label: `${activeCity} - ${prompt.trim()}`,
        };
        const updated = [newArt, ...savedArts.slice(0, 9)];
        setSavedArts(updated);
        try {
          localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
        } catch {}
        props.onSelectBackground(data.imageUrl);
        handleClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h3 className="font-bold text-base">{t("gallery_title")}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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
            {t("tab_curated")}
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-2 px-3 border-b-2 transition ${
              activeTab === "saved"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_saved")} ({savedArts.length})
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`pb-2 px-3 border-b-2 transition ${
              activeTab === "generate"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_generate")}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "curated" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {curatedList.length} artworks for {activeCity}
                </span>
                <button
                  onClick={() => handleSelect("")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("gallery_reset_art")}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {curatedList.map((art, idx) => {
                  const isCurActive = activeBackground === art.url;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(art.url)}
                      className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                        isCurActive
                          ? "border-primary ring-2 ring-primary/40 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={art.url}
                        alt={art.title || "Art"}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                      <span className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold text-white truncate">
                        {art.title || activeCity}
                      </span>
                      {isCurActive && (
                        <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold shadow">
                          {t("gallery_active_badge")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "saved" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {savedArts.length} saved
                </span>
                {savedArts.length > 0 && (
                  <button
                    onClick={handleClearSaved}
                    className="text-xs text-destructive hover:underline"
                  >
                    {t("gallery_clear_saved")}
                  </button>
                )}
              </div>
              {savedArts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  {t("gallery_empty_saved")}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedArts.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => handleSelect(art.url)}
                      className="group relative rounded-xl overflow-hidden border border-border cursor-pointer aspect-video"
                    >
                      <img
                        src={art.url}
                        alt={art.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold text-white truncate">
                        {art.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "generate" && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  {t("gallery_prompt_label")} ({activeCity})
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("gallery_prompt_placeholder")}
                  rows={3}
                  className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-2">
                  {t("gallery_preset_inspiration")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "golden temple reflecting in morning rain",
                    "misty old town market under soft clouds",
                    "vibrant sunset skyline in watercolor",
                    "snowy mountain pass with dramatic clouds",
                  ].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setPrompt(idea)}
                      className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition disabled:opacity-50"
              >
                {isGenerating
                  ? t("gallery_btn_generating")
                  : t("gallery_btn_generate")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
