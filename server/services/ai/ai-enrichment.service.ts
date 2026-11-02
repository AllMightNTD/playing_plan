import { nanoid } from "nanoid";
import { db, type DbExecutor } from "@/server/db/client";
import { fieldProvenance } from "@/server/db/schema/governance";
import { assertFieldProvenanceAllowed } from "@/server/services/admin/governance.policy";
import {
  AiEnrichmentOutputSchema,
  type AiEnrichmentOutput,
} from "./ai-enrichment.schema";
import { AI_SYSTEM_PROMPT, wrapUntrustedContent } from "./ai-guard";
import {
  DEFAULT_GEMINI_FLASH_MODEL,
  generateStructuredJson,
  resolveGeminiApiKey,
} from "./gemini-gateway";

export interface EnrichPlaceInput {
  placeId: string;
  placeName: string;
  videoTitle: string;
  videoDescription: string;
  apiKey?: string;
  executor?: DbExecutor;
}

export interface EnrichPlaceResult {
  placeId: string;
  enrichment: AiEnrichmentOutput;
  provenanceRecorded: boolean;
}

function buildFallbackEnrichment(placeName: string): AiEnrichmentOutput {
  return AiEnrichmentOutputSchema.parse({
    summary: `Không gian lãng mạn, view thoáng đãng tại ${placeName}, rất thích hợp cho các buổi hẹn hò tâm tình.`,
    outfitGeneralTip: "Trang phục lịch sự, thanh lịch (smart-casual), tone màu pastel nhẹ nhàng.",
    suggestedMoods: ["lãng mạn", "chill", "ngắm cảnh"],
  });
}

/**
 * Enriches venue descriptions safely via the unified Gemini gateway and records provenance.
 */
export async function enrichPlaceWithAi(
  input: EnrichPlaceInput
): Promise<EnrichPlaceResult> {
  assertFieldProvenanceAllowed("ai", "summary");
  assertFieldProvenanceAllowed("ai", "outfit_general_tip");

  const wrappedInput = wrapUntrustedContent(input.videoTitle, input.videoDescription);
  const apiKey = resolveGeminiApiKey(input.apiKey);

  let validatedOutput: AiEnrichmentOutput | null = null;

  if (apiKey) {
    try {
      validatedOutput = await generateStructuredJson({
        apiKey,
        model: DEFAULT_GEMINI_FLASH_MODEL,
        systemInstruction: AI_SYSTEM_PROMPT,
        input: `Địa điểm cần tổng hợp: ${input.placeName}

Dữ liệu đầu vào:
${wrappedInput}

Hãy trả về duy nhất 1 JSON object với các trường: summary (string tối đa 250 ký tự), outfitGeneralTip (string tối đa 200 ký tự), suggestedMoods (mảng string tối đa 4 phần tử).`,
        schema: AiEnrichmentOutputSchema,
      });
    } catch (err: unknown) {
      console.warn(
        JSON.stringify({
          event: "ai_enrichment.fallback",
          placeId: input.placeId,
          reason: err instanceof Error ? err.name : "unknown",
          at: new Date().toISOString(),
        })
      );
    }
  }

  const enrichment = validatedOutput ?? buildFallbackEnrichment(input.placeName);
  const executor = input.executor ?? db;

  await executor.insert(fieldProvenance).values({
    id: `prv_${nanoid(16)}`,
    placeId: input.placeId,
    fieldName: "summary",
    source: "ai",
    confidence: "0.40",
    verified: false,
    evidenceUrl: `video_enrichment:${input.placeId}`,
    updatedAt: new Date(),
  });

  return {
    placeId: input.placeId,
    enrichment,
    provenanceRecorded: true,
  };
}
