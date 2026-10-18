// src/routes/api/generate-watercolor.ts
import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

export const Route = createAPIFileRoute("/api/generate-watercolor")({
  POST: async ({ request }) => {
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) {
        return json({ error: "Missing LOVABLE_API_KEY on the server." }, { status: 500 });
      }

      const body = await request.json();
      const { city, userPrompt, weatherDesc } = body as {
        city: string;
        userPrompt: string;
        weatherDesc?: string;
      };

      if (!city || !userPrompt) {
        return json({ error: "City name and prompt description are required." }, { status: 400 });
      }

      // Prompt engineering tailored for luminous, atmospheric watercolor
      const enhancedPrompt = [
        `Vibrant artistic watercolor painting of landmark scenery in ${city}.`,
        weatherDesc ? `Weather mood: ${weatherDesc}.` : "",
        `Scene details: ${userPrompt}.`,
        "Style: fluid wet-in-wet watercolor wash, visible paper texture, luminous atmospheric lighting, rich pigment blooms, loose painterly brushwork, cinematic panoramic composition, no text, no watermarks.",
      ]
        .filter(Boolean)
        .join(" ");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-2.5-sunburst",
          prompt: enhancedPrompt,
          size: "1024x1024",
          n: 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway Image Generation error:", errorText);
        return json(
          { error: "AI image generation failed. Check your API allowance or retry." },
          { status: response.status }
        );
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;

      if (!imageUrl) {
        return json({ error: "No image was returned from the model." }, { status: 502 });
      }

      // If base64 was returned, format as data URL
      const finalUrl = imageUrl.startsWith("http") || imageUrl.startsWith("data:")
        ? imageUrl
        : `data:image/jpeg;base64,${imageUrl}`;

      return json({ imageUrl: finalUrl, prompt: enhancedPrompt });
    } catch (err: any) {
      console.error("Error in generate-watercolor route:", err);
      return json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
  },
});
