import { z } from "zod";
import {
  BUDGET_LEVEL_MAX,
  BUDGET_LEVEL_MIN,
  MOOD_KEYS,
  PLACE_CATEGORIES,
} from "@/lib/constants/catalog";

export const PLACE_STATUSES = ["draft", "published", "hidden"] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

const MAX_COST_VND = 100_000_000;
const DEFAULT_ADMIN_PAGE_SIZE = 20;
const MAX_ADMIN_PAGE_SIZE = 100;

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const weekdaysSchema = z.array(z.number().int().min(0).max(6)).max(7);
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const shortTextSchema = z.string().trim().max(300);
const httpsUrlSchema = z.string().url().max(1000).startsWith("https://");
const cursorSchema = z.string().regex(/^\d+$/).optional();

export const outfitSchema = z
  .object({
    palette: z.array(hexColorSchema).max(8),
    tonSurTon: shortTextSchema,
    contrast: shortTextSchema,
    avoid: shortTextSchema,
    weatherTip: shortTextSchema,
  })
  .strict();

export const placeGuideInputSchema = z
  .object({
    bestTimes: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(80),
            start: timeOfDaySchema,
            end: timeOfDaySchema,
            type: z.enum(["golden", "blue", "quiet"]),
            note: z.string().trim().max(200).optional(),
          })
          .strict()
      )
      .max(10),
    bestWeekdays: weekdaysSchema,
    avoidWeekdays: weekdaysSchema,
    bestSeasons: z
      .array(
        z
          .object({
            months: z.array(z.number().int().min(1).max(12)).min(1).max(12),
            note: z.string().trim().max(200),
          })
          .strict()
      )
      .max(4),
    crowdNotes: z.string().trim().max(1000).nullable(),
    photoSpots: z
      .array(z.object({ name: shortTextSchema.min(1), howToFind: shortTextSchema, tip: shortTextSchema }).strict())
      .max(20),
    poses: z.array(z.object({ title: shortTextSchema.min(1), desc: shortTextSchema }).strict()).max(20),
    outfit: outfitSchema,
    tips: z.string().trim().max(2000),
    sourceLinks: z.array(httpsUrlSchema).max(10),
  })
  .partial()
  .strict();

const placeFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  area: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: z.enum(PLACE_CATEGORIES),
  priceLevel: z.number().int().min(BUDGET_LEVEL_MIN).max(BUDGET_LEVEL_MAX),
  estCostMin: z.number().int().min(0).max(MAX_COST_VND),
  estCostMax: z.number().int().min(0).max(MAX_COST_VND),
  moods: z.array(z.enum(MOOD_KEYS)).max(MOOD_KEYS.length),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  indoor: z.boolean(),
  coverUrl: httpsUrlSchema.or(z.literal("")),
  summary: z.string().trim().max(300),
  openingHours: z.record(z.string().max(80)).nullable(),
});

const isCostRangeValid = (body: { estCostMin?: number; estCostMax?: number }) =>
  body.estCostMin === undefined || body.estCostMax === undefined || body.estCostMin <= body.estCostMax;

export const createPlaceBodySchema = placeFieldsSchema
  .extend({
    slug: placeFieldsSchema.shape.slug.optional(),
    estCostMin: placeFieldsSchema.shape.estCostMin.default(0),
    estCostMax: placeFieldsSchema.shape.estCostMax.default(0),
    moods: placeFieldsSchema.shape.moods.default([]),
    tags: placeFieldsSchema.shape.tags.default([]),
    indoor: placeFieldsSchema.shape.indoor.default(false),
    coverUrl: placeFieldsSchema.shape.coverUrl.default(""),
    summary: placeFieldsSchema.shape.summary.default(""),
    openingHours: placeFieldsSchema.shape.openingHours.default(null),
    guide: placeGuideInputSchema.optional(),
  })
  .strict()
  .refine(isCostRangeValid, { message: "COST_RANGE_INVALID", path: ["estCostMax"] });

export const updatePlaceBodySchema = placeFieldsSchema
  .partial()
  .extend({ guide: placeGuideInputSchema.optional() })
  .strict()
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: "EMPTY_UPDATE" })
  .refine(isCostRangeValid, { message: "COST_RANGE_INVALID", path: ["estCostMax"] });

export const adminPlaceListQuerySchema = z.object({
  status: z.enum(PLACE_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  cursor: cursorSchema,
  limit: z.coerce.number().int().min(1).max(MAX_ADMIN_PAGE_SIZE).default(DEFAULT_ADMIN_PAGE_SIZE),
});

export const auditLogQuerySchema = z.object({
  cursor: cursorSchema,
  limit: z.coerce.number().int().min(1).max(MAX_ADMIN_PAGE_SIZE).default(50),
});

export const aiExtractBodySchema = z
  .object({
    text: z.string().trim().min(10).max(10000),
    sourceUrl: httpsUrlSchema.optional(),
  })
  .strict();

/** Kết quả Gemini luôn phải qua schema này trước khi tới tay admin (F17). */
export const extractedGuideSchema = z.object({
  summary: z.string(),
  bestTimeText: z.string(),
  bestWeekdays: z.string(),
  avoidWeekdays: z.string(),
  photoSpots: z.array(z.object({ name: z.string(), howToFind: z.string(), tip: z.string() })),
  poses: z.array(z.object({ title: z.string(), desc: z.string() })),
  outfit: z.object({
    palette: z.array(z.string()),
    tonSurTon: z.string(),
    contrast: z.string(),
    avoid: z.string(),
    weatherTip: z.string(),
  }),
  tips: z.string(),
});

export type PlaceGuideInput = z.infer<typeof placeGuideInputSchema>;
export type CreatePlaceBody = z.infer<typeof createPlaceBodySchema>;
export type UpdatePlaceBody = z.infer<typeof updatePlaceBodySchema>;
export type AdminPlaceListQuery = z.infer<typeof adminPlaceListQuerySchema>;
export type AiExtractBody = z.infer<typeof aiExtractBodySchema>;
export type ExtractedGuide = z.infer<typeof extractedGuideSchema>;
