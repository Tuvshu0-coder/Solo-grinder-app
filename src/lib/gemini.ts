// Google Gemini client for the AI quiz (rule 24). Server-only: the API key never reaches the browser.
// Only the subject name, topic and rank are sent — never the student's name or other personal data.
import { cleanQuestions, QUIZ_OPTIONS, QUIZ_QUESTIONS } from "./quiz-rules";

export type GeneratedQuestion = { question: string; options: string[]; correctIndex: number };
export type GenerateResult = { ok: true; questions: GeneratedQuestion[] } | { ok: false; reason: string };

/** Thrown when Gemini is unreachable, over its free quota, or returns garbage (rule 30). */
export class GeminiUnavailable extends Error {}

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

const RANK_LEVEL: Record<string, string> = {
  E: "анхан шат — үндсэн ойлголт, тодорхойлолт",
  D: "анхан-дунд шат — энгийн хэрэглээ",
  C: "дунд шат — ойлголтоо хэрэглэх",
  B: "дунд-ахисан шат — шинжлэх, харьцуулах",
  A: "ахисан шат — нийлмэл бодлого, шалтгаан",
  S: "гүнзгий шат — сорилттой, олон алхамтай",
};

export function aiConfigured(): boolean {
  return process.env.AI_QUIZ_MOCK === "1" || !!process.env.GEMINI_API_KEY;
}

export async function generateQuiz(input: { subject: string; topic: string; rank: string }): Promise<GenerateResult> {
  if (process.env.AI_QUIZ_MOCK === "1") return mockQuiz(input);

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiUnavailable("GEMINI_API_KEY тохируулаагүй");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const prompt = [
    "Чи коллежийн оюутанд зориулсан богино тест зохиогч.",
    `Хичээл: ${input.subject}`,
    `Сэдэв: ${input.topic}`,
    `Түвшин: ${input.rank} (${RANK_LEVEL[input.rank] ?? RANK_LEVEL.E})`,
    "",
    "Эхлээд шалга: сэдэв нь энэ хичээлтэй холбоотой бөгөөд тодорхой (хэт ерөнхий биш) эсэх.",
    'Хэрэв холбоогүй эсвэл хэт ерөнхий бол "valid": false, "reason"-д монголоор богино шалтгаан бич, "questions" хоосон.',
    `Үгүй бол "valid": true, ${QUIZ_QUESTIONS} асуулт монгол хэлээр зохио.`,
    `Асуулт бүр яг ${QUIZ_OPTIONS} сонголттой, зөвхөн нэг нь зөв, сонголтууд давхардахгүй.`,
    '"correctIndex" нь зөв сонголтын 0-ээс эхэлсэн дугаар.',
  ].join("\n");

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              valid: { type: "BOOLEAN" },
              reason: { type: "STRING" },
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    correctIndex: { type: "INTEGER" },
                  },
                  required: ["question", "options", "correctIndex"],
                },
              },
            },
            required: ["valid", "reason", "questions"],
          },
        },
      }),
    });
  } catch (e) {
    throw new GeminiUnavailable(`Сүлжээний алдаа: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok) throw new GeminiUnavailable(`Gemini HTTP ${res.status}`); // 429 = free quota used up

  let parsed: { valid?: boolean; reason?: string; questions?: unknown };
  try {
    const body = await res.json();
    const text: string = body?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiUnavailable("Gemini-ийн хариуг уншиж чадсангүй");
  }

  if (parsed.valid === false) {
    return { ok: false, reason: parsed.reason?.trim() || "Сэдэв хичээлтэй холбоогүй эсвэл хэт ерөнхий байна." };
  }
  const questions = cleanQuestions(parsed.questions);
  if (!questions) throw new GeminiUnavailable("Gemini буруу бүтэцтэй асуулт буцаасан");
  return { ok: true, questions };
}

/** Offline stand-in for local development and tests (AI_QUIZ_MOCK=1). */
function mockQuiz({ subject, topic }: { subject: string; topic: string }): GenerateResult {
  if (/^(бүх|юу ч|ерөнхий|test-invalid)/i.test(topic.trim())) {
    return { ok: false, reason: `"${topic}" сэдэв хэт ерөнхий эсвэл "${subject}" хичээлтэй холбоогүй байна.` };
  }
  return {
    ok: true,
    questions: Array.from({ length: QUIZ_QUESTIONS }, (_, i) => ({
      question: `[MOCK] ${subject} · ${topic}: ${i + 1}-р асуулт`,
      options: ["Зөв хариулт", "Буруу хариулт А", "Буруу хариулт Б", "Буруу хариулт В"],
      correctIndex: 0,
    })),
  };
}
