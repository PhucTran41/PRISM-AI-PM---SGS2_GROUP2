import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  const formData = await req.formData();

  const messages = JSON.parse(formData.get("messages") as string);
  const files = formData.getAll("files") as File[];

  const parts: any[] = [];

  // System instruction
  parts.push({
    text: `
Respond using this structure ONLY:

### Overview
(short paragraph)

---

### Sections
(use numbered headings)

---

### Comparison Table
(use markdown table)

---

### Summary
(bullets)
`,
  });

  // Conversation
  parts.push({
    text: messages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
  });

  // Files
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: buffer.toString("base64"),
        },
      });
    } else if (file.type === "text/plain") {
      parts.push({ text: buffer.toString("utf-8") });
    }
  }

  // 🔥 STREAMING
  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    }
  );
}
