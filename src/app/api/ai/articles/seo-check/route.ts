import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  keyword: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  metaDescription: z.string().min(1).max(300),
  body: z.string().min(1).max(15000),
  locale: z.enum(["vi", "en"]).optional().default("vi"),
});

const seoResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  issues: z.array(
    z.object({
      field: z.enum(["title", "summary", "metaDescription", "body"]),
      severity: z.enum(["error", "warning", "info"]),
      message: z.string(),
      fix: z.string().nullable().optional(),
    }),
  ),
});

export type SeoCheckResult = z.infer<typeof seoResultSchema>;
export type SeoIssue = SeoCheckResult["issues"][number];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }

  const { keyword, title, summary, metaDescription, body, locale } = parsed.data;
  const language = locale === "en" ? "English" : "Vietnamese";

  const config = resolveAiProvider();
  if (!config) {
    return Response.json({ error: "no_ai_provider" }, { status: 500 });
  }

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const h2Count = (body.match(/^## /gm) ?? []).length;
  const titleLen = title.length;
  const metaLen = metaDescription.length;
  const hasDisclaimer = /disclaimer|rủi ro|cảnh báo|risk warning|risk disclaimer/i.test(body);
  const keywordLower = keyword.toLowerCase();
  const keywordInTitle = title.toLowerCase().includes(keywordLower);

  const prompt = `You are an SEO specialist for a forex educational website. Analyze this article and return a JSON report.

Article language: ${language}

Context:
- Keyword: "${keyword}"
- Title (${titleLen} chars): "${title}"
- Summary: "${summary}"
- Meta Description (${metaLen} chars): "${metaDescription}"
- Body stats: ${wordCount} words, ${h2Count} H2 sections, disclaimer present: ${hasDisclaimer}, keyword in title: ${keywordInTitle}
- Body (first 2500 chars):
${body.slice(0, 2500)}

Return JSON only (no markdown):
{
  "score": <integer 0-100>,
  "issues": [
    {
      "field": <"title"|"summary"|"metaDescription"|"body">,
      "severity": <"error"|"warning"|"info">,
      "message": <specific issue description in ${language}>,
      "fix": <replacement text in ${language} if applicable, null otherwise>
    }
  ]
}

Scoring rules (deduct from 100):
- Generic title not containing keyword: -20
- Title < 40 or > 70 chars: -10
- Meta description < 140 or > 165 chars: -10
- Keyword not in meta description: -10
- Body < 500 words: -20
- Body < 3 H2 sections: -15
- No risk disclaimer: -15
- Summary is generic (no specific market context): -10

Issue rules:
- Report issues only if they actually apply
- For title/summary/metaDescription issues where a fix is clear, provide the improved replacement text as "fix" (must be in ${language})
- For body issues, "fix" should be null; describe what to add in "message"
- Use severity "error" for issues that directly hurt SEO rankings
- Use severity "warning" for best-practice violations
- Use severity "info" for minor improvements
- Write ALL messages and fixes in ${language} only
- Be specific: quote the problematic phrase, suggest the exact fix`;

  const client = createAiClient(config);

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an SEO analyst. Return valid JSON only, no markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json({ error: "empty_response" }, { status: 500 });
    }

    const json = JSON.parse(content);
    const result = seoResultSchema.safeParse(json);
    if (!result.success) {
      return Response.json({ error: "invalid_ai_response" }, { status: 500 });
    }

    return Response.json(result.data);
  } catch {
    return Response.json({ error: "ai_failed" }, { status: 500 });
  }
}
