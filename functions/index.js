const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ALLOWED_EMAILS = [
  "fadlon1980@gmail.com",
  "fadlonmay@gmail.com"
];

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 420);
}

exports.describeBinPhoto = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "512MiB",
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const email = String(request.auth?.token?.email || "").toLowerCase();
    if (!email || !ALLOWED_EMAILS.includes(email)) {
      throw new HttpsError("permission-denied", "This account is not approved for BinView AI descriptions.");
    }

    const data = request.data || {};
    const imageBase64 = String(data.imageBase64 || "");
    const mimeType = String(data.mimeType || "image/jpeg");

    if (!imageBase64) {
      throw new HttpsError("invalid-argument", "Missing image data.");
    }

    // Keep request size controlled. Client sends an analysis copy, not the full uploaded photo.
    if (imageBase64.length > 6_500_000) {
      throw new HttpsError("invalid-argument", "Image is too large for AI description. Try a smaller photo.");
    }

    const apiKey = GEMINI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY secret is not configured.");
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const context = [
      data.binName ? `Bin name: ${data.binName}` : "",
      data.binLocation ? `Location: ${data.binLocation}` : "",
      data.binCategory ? `Category: ${data.binCategory}` : "",
      data.caption ? `Existing photo caption: ${data.caption}` : "",
      data.binNotes ? `Bin notes: ${data.binNotes}` : ""
    ].filter(Boolean).join("\n");

    const prompt = `You are helping create a practical inventory for a private family garage storage-bin app.\n\n${context}\n\nLook at the photo and write one short useful description of the visible contents. Focus on item categories and recognizable objects, for example: winter jackets, shoes, toys, cables, tools, books, decorations. Mention colors/sizes only if useful. Do not identify people. If the image is unclear, say what is visible. Return only the description, max 35 words.`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 90
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Gemini API error", response.status, JSON.stringify(json).slice(0, 1000));
      throw new HttpsError("internal", "Gemini could not describe this photo.");
    }

    const raw = json.candidates?.[0]?.content?.parts?.map(part => part.text || "").join(" ") || "";
    const description = cleanText(raw);

    if (!description) {
      return { description: "", model, status: "empty" };
    }

    return { description, model, status: "generated" };
  }
);
