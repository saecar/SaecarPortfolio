import axios from "axios";

export type ProjectCategory =
  | "iot"
  | "game"
  | "web"
  | "web-frontend"
  | "web-backend"
  | "web-fullstack";

function fallbackReadme({
  repo,
  slug,
  category,
}: {
  repo: string;
  slug: string;
  category: ProjectCategory;
}) {
  const labels: Record<ProjectCategory, string> = {
    iot: "IoT",
    game: "Game",
    web: "Web",
    "web-frontend": "Web (Frontend)",
    "web-backend": "Web (Backend)",
    "web-fullstack": "Web (Fullstack)",
  };
  const label = labels[category] ?? "Web";
  const description = `Project ${repo} (${slug}) — ${label} showcase`;
  const readme = `# ${repo}

> ${description}

## Fitur
- Fitur utama akan diisi otomatis setelah integrasi AI

## Tech Stack
- Dependencies terdeteksi otomatis

## Cara Pemasangan
\`\`\`bash
# Install dependencies
npm install
# Run development
npm run dev
\`\`\`

## Cara Pakai
Ikuti dokumentasi di setiap modul.

## Struktur Folder
\`\`\`
/assets
/components
/pages
\`\`\`

## Lisensi
MIT License.
`;
  return { description, readme };
}

export async function generateReadme({
  repo,
  slug,
  category,
  topics = [],
  name = repo,
}: {
  repo: string;
  slug: string;
  category: ProjectCategory;
  topics?: string[];
  name?: string;
}): Promise<{ description: string; readme: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey) return fallbackReadme({ repo, slug, category });

  const safeTopics = (topics || []).slice(0, 20).join(", ");
  const prompt = `Anda asisten pembuat README profesional. Buat README untuk proyek "${name}" (slug: "${slug}") kategori "${category}".
Topics: ${safeTopics || "-"}
Output wajib Markdown:
1. Header "# ${name}"
2. 1 kalimat deskripsi Bahasa Indonesia di bawah header (tanpa heading)
3. ## Fitur (minimal 2 bullet)
4. ## Tech Stack
5. ## Cara Pemasangan (step-by-step minimal 3)
6. ## Cara Pakai
7. ## Struktur Folder
8. ## Lisensi (MIT)
Aturan:
- IoT: sebut pin/wiring/firmware/platformio/johnny-five/esp32
- Game: sebut engine/build output/phaser/unity/godot/threejs
- Web: sebut framework next/vite/react, DB, deploy vercel/netlify
- Deskripsi 1 baris Bahasa Indonesia, README boleh campur ID/EN`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1400,
        },
      },
      { signal: AbortSignal.timeout(15000) }
    );

    const text: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text.trim()) return fallbackReadme({ repo, slug, category });

    // Sanitasi: strip <script>
    const sanitized = text.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Deskripsi = baris pertama non-heading non-kosong setelah "# "
    const lines = sanitized.split("\n");
    let description = "";
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith("```")) continue;
      // skip blockquote marker
      const cleaned = t.replace(/^>\s*/, "");
      if (cleaned) {
        description = cleaned;
        break;
      }
    }
    if (!description) description = `${name} — ${category} project`;

    return { description, readme: sanitized };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[readme-template] Gemini error:", msg);
    return fallbackReadme({ repo, slug, category });
  }
}
