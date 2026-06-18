import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  keyword: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  locale: z.enum(["vi", "en"]),
  body: z.string().min(1).max(80000),
});

const resultSchema = z.object({
  overall: z.string(),
  weakSections: z.array(
    z.object({
      heading: z.string(),
      issue: z.string(),
      severity: z.enum(["error", "warning", "info"]),
    }),
  ),
  rewrittenBody: z.string(),
  imageSuggestions: z.array(
    z.object({
      location: z.string(),
      searchKeyword: z.string(),
      caption: z.string(),
    }),
  ),
});

export type AnalyzeContentResult = z.infer<typeof resultSchema>;

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  const { keyword, title, locale, body } = parsed.data;
  const config = resolveAiProvider();
  if (!config) return Response.json({ error: "no_ai_provider" }, { status: 500 });

  const lang = locale === "vi" ? "Vietnamese" : "English";
  const plainText = stripHtml(body);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const h2Count = (body.match(/<h2/gi) ?? []).length;

  const prompt = `You are a senior content editor for a forex trading education website. Analyze this article and return a JSON improvement report.

Article info:
- Keyword: "${keyword}"
- Title: "${title}"
- Language: ${lang}
- Word count: ~${wordCount} words
- H2 sections: ${h2Count}

Article body (plain text excerpt):
${plainText}

Full HTML body:
${body.slice(0, 12000)}

Return JSON only (no markdown wrapper):
{
  "overall": "<2-3 sentence summary of the article's current quality and main issues, in ${lang}>",
  "weakSections": [
    {
      "heading": "<H2 section heading or 'Introduction'/'Conclusion'>",
      "issue": "<Specific problem with this section in ${lang}>",
      "severity": "<'error'|'warning'|'info'>"
    }
  ],
  "rewrittenBody": "<Complete improved HTML body. Use h2/h3/p/ul/li/ol/strong/blockquote tags. In ${lang}. Must have 5+ H2 sections, 600+ words, specific market facts (not generic advice), and a risk disclaimer at the end.>",
  "imageSuggestions": [
    {
      "location": "<Where in the article to place this image, in ${lang}>",
      "searchKeyword": "<English keyword for Unsplash image search, e.g. 'gold trading chart'>",
      "caption": "<Image caption in ${lang}>"
    }
  ]
}

Rules for rewrittenBody:
- Write in ${lang} only
- Start with a compelling intro paragraph (no H2)
- Use concrete examples, numbers, and current market context
- Every bullet point must contain a specific fact or action
- Include internal references like ${locale === "vi" ? '"theo dõi lịch kinh tế", "kiểm tra trên biểu đồ", "xác nhận với broker"' : '"check the economic calendar", "verify on your chart", "confirm with your broker"'}
- End with a risk disclaimer section in ${lang}
- imageSuggestions: suggest 2-3 image placements that would enhance understanding`;

  const client = createAiClient(config);

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a content editor. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return Response.json({ error: "empty_response" }, { status: 500 });

    const json = JSON.parse(content);
    const result = resultSchema.safeParse(json);
    if (!result.success) return Response.json({ error: "invalid_ai_response" }, { status: 500 });

    return Response.json(result.data);
  } catch {
    return Response.json({ error: "ai_failed" }, { status: 500 });
  }
}
