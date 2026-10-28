import { z } from "zod";

/**
 * Schema đầu ra làm giàu dữ liệu từ AI bằng Zod Strict Mode.
 * CẤM TUYỆT ĐỐI các trường dữ liệu hoạt động thực tế như openingHours, estCost, photoSpots, poses.
 */
export const AiEnrichmentOutputSchema = z
  .object({
    summary: z
      .string()
      .min(10, "Mô tả phải có ít nhất 10 ký tự")
      .max(250, "Mô tả không được vượt quá 250 ký tự"),
    outfitGeneralTip: z
      .string()
      .min(5, "Gợi ý trang phục phải có ít nhất 5 ký tự")
      .max(200, "Gợi ý trang phục không được vượt quá 200 ký tự"),
    suggestedMoods: z
      .array(z.string().min(2).max(30))
      .min(1, "Phải có ít nhất 1 mood phù hợp")
      .max(4, "Tối đa 4 mood phù hợp"),
  })
  .strict();

export type AiEnrichmentOutput = z.infer<typeof AiEnrichmentOutputSchema>;
