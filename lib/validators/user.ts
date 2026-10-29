import { z } from "zod";
import {
  BUDGET_LEVEL_MAX,
  BUDGET_LEVEL_MIN,
  MAX_WIZARD_MOODS,
  MOOD_KEYS,
  PLACE_CATEGORIES,
  TIME_SLOTS,
  TRANSPORT_MODES,
} from "@/lib/constants/catalog";
import {
  INVITE_CODE_LENGTH,
  MAX_PLAN_STOPS,
  MEMORY_NOTE_COLORS,
  MEMORY_NOTE_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  PLAN_STATUSES,
  ROOM_NAME_MAX_LENGTH,
  SWIPE_CHOICES,
} from "@/lib/constants/user";

const MAX_EXCLUDE_SLUGS = 50;
const MAX_PAGE_SIZE = 24;
const DEFAULT_PAGE_SIZE = 12;
const MAX_DECK_SIZE = 30;
const DEFAULT_DECK_SIZE = 20;
const MAX_SUGGESTIONS = 8;
const MAX_BUDGET_VND = 100_000_000;

const slugSchema = z.string().trim().min(1).max(120);
const entityIdSchema = z.string().trim().min(1).max(21);
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), { message: "INVALID_DATE" });
const nicknameSchema = z.string().trim().min(1).max(NICKNAME_MAX_LENGTH);
const base64UrlSecretSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);
const budgetLevelSchema = z.coerce.number().int().min(BUDGET_LEVEL_MIN).max(BUDGET_LEVEL_MAX);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");
const csvSlugsSchema = z
  .string()
  .transform((value) => value.split(",").map((slug) => slug.trim()).filter(Boolean))
  .pipe(z.array(slugSchema).max(MAX_EXCLUDE_SLUGS));

export const placeListQuerySchema = z.object({
  mood: z.enum(MOOD_KEYS).optional(),
  category: z.enum(PLACE_CATEGORIES).optional(),
  price: budgetLevelSchema.optional(),
  area: z.string().trim().max(80).optional(),
  indoor: booleanQuerySchema.optional(),
  q: z.string().trim().max(100).optional(),
  cursor: z.string().regex(/^\d+$/).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const randomPlaceQuerySchema = z.object({
  mood: z.enum(MOOD_KEYS).optional(),
  category: z.enum(PLACE_CATEGORIES).optional(),
  exclude: csvSlugsSchema.optional(),
});

export const videoCatalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  tab: z.enum(["all", "recommend", "popular", "latest"]).default("all"),
  channel: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const recommendBodySchema = z.object({
  budget: budgetLevelSchema,
  moods: z.array(z.enum(MOOD_KEYS)).min(1).max(MAX_WIZARD_MOODS),
  slot: z.enum(TIME_SLOTS),
  transport: z.enum(TRANSPORT_MODES),
  isRainy: z.boolean().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  excludeSlugs: z.array(slugSchema).max(MAX_EXCLUDE_SLUGS).optional(),
});

const hasAnyField = (body: object) => Object.values(body).some((value) => value !== undefined);

export const createPlanBodySchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    planDate: isoDateSchema,
    startTime: timeOfDaySchema,
    budget: z.number().int().min(0).max(MAX_BUDGET_VND).optional(),
    isSecret: z.boolean().optional(),
    revealAt: z.coerce.date().optional(),
    note: z.string().trim().max(1000).optional(),
    placeId: entityIdSchema.optional(),
  })
  .strict()
  .refine((body) => body.revealAt === undefined || body.isSecret === true, {
    message: "REVEAL_AT_REQUIRES_SECRET",
    path: ["revealAt"],
  });

export const updatePlanBodySchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    planDate: isoDateSchema,
    startTime: timeOfDaySchema,
    status: z.enum(PLAN_STATUSES),
    budget: z.number().int().min(0).max(MAX_BUDGET_VND).nullable(),
    note: z.string().trim().max(1000).nullable(),
    expectedUpdatedAt: z.coerce.date(),
  })
  .partial()
  .strict()
  .refine(({ expectedUpdatedAt: _ignored, ...fields }) => hasAnyField(fields), {
    message: "EMPTY_UPDATE",
  });

export const addStopBodySchema = z
  .object({
    placeId: entityIdSchema.optional(),
    customName: z.string().trim().min(1).max(150).optional(),
    plannedTime: timeOfDaySchema.optional(),
    durationMin: z.number().int().min(5).max(720).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((body) => Boolean(body.placeId) !== Boolean(body.customName), {
    message: "PLACE_OR_CUSTOM_NAME_REQUIRED",
  });

export const updateStopBodySchema = z
  .object({
    customName: z.string().trim().min(1).max(150),
    plannedTime: timeOfDaySchema.nullable(),
    durationMin: z.number().int().min(5).max(720),
    isPinnedTime: z.boolean(),
    note: z.string().trim().max(500).nullable(),
  })
  .partial()
  .strict()
  .refine(hasAnyField, { message: "EMPTY_UPDATE" });

export const reorderStopsBodySchema = z
  .object({
    stopIds: z.array(entityIdSchema).min(1).max(MAX_PLAN_STOPS),
  })
  .strict()
  .refine((body) => new Set(body.stopIds).size === body.stopIds.length, {
    message: "DUPLICATE_STOP_ID",
    path: ["stopIds"],
  });

export const createChecklistItemBodySchema = z
  .object({
    content: z.string().trim().min(1).max(200),
    assignedTo: entityIdSchema.nullable().optional(),
  })
  .strict();

export const updateChecklistItemBodySchema = z
  .object({
    content: z.string().trim().min(1).max(200),
    isDone: z.boolean(),
    assignedTo: entityIdSchema.nullable(),
  })
  .partial()
  .strict()
  .refine(hasAnyField, { message: "EMPTY_UPDATE" });

export const swipeBodySchema = z
  .object({
    placeId: entityIdSchema,
    choice: z.enum(SWIPE_CHOICES),
  })
  .strict();

export const deckQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_DECK_SIZE).default(DEFAULT_DECK_SIZE),
  hobby: z.string().trim().max(30).optional(),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(MAX_SUGGESTIONS).default(MAX_SUGGESTIONS),
});

export const createSessionBodySchema = z
  .object({
    nickname: nicknameSchema.optional(),
  })
  .strict();

export const updateMeBodySchema = z
  .object({
    nickname: nicknameSchema,
    roomName: z.string().trim().min(1).max(ROOM_NAME_MAX_LENGTH).nullable(),
    anniversaryDate: isoDateSchema.nullable(),
  })
  .partial()
  .strict()
  .refine(hasAnyField, { message: "EMPTY_UPDATE" });

export const joinRoomBodySchema = z
  .object({
    token: base64UrlSecretSchema.optional(),
    code: z
      .string()
      .transform((value) => {
        // Mã hiển thị dạng DM-XXXX-XXXX: bỏ tiền tố DM nếu người dùng gõ kèm
        const cleaned = value.replace(/[\s-]/g, "").toUpperCase();
        return cleaned.length === INVITE_CODE_LENGTH + 2 && cleaned.startsWith("DM") ? cleaned.slice(2) : cleaned;
      })
      .pipe(z.string().regex(new RegExp(`^[A-Z0-9]{${INVITE_CODE_LENGTH}}$`)))
      .optional(),
    nickname: nicknameSchema.optional(),
  })
  .strict()
  .refine((body) => Boolean(body.token) !== Boolean(body.code), {
    message: "TOKEN_OR_CODE_REQUIRED",
  });

export const recoverRoomBodySchema = z
  .object({
    key: base64UrlSecretSchema,
  })
  .strict();

export const createMemoryNoteBodySchema = z
  .object({
    content: z.string().trim().min(1).max(MEMORY_NOTE_MAX_LENGTH),
    color: z.enum(MEMORY_NOTE_COLORS).optional(),
  })
  .strict();

export const quickAddPlanBodySchema = z
  .object({
    placeId: entityIdSchema,
  })
  .strict();

export type PlaceListQuery = z.infer<typeof placeListQuerySchema>;
export type RecommendBody = z.infer<typeof recommendBodySchema>;
export type CreatePlanBody = z.infer<typeof createPlanBodySchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanBodySchema>;
export type AddStopBody = z.infer<typeof addStopBodySchema>;
export type UpdateStopBody = z.infer<typeof updateStopBodySchema>;
export type CreateChecklistItemBody = z.infer<typeof createChecklistItemBodySchema>;
export type UpdateChecklistItemBody = z.infer<typeof updateChecklistItemBodySchema>;
export type SwipeBody = z.infer<typeof swipeBodySchema>;
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
export type JoinRoomBody = z.infer<typeof joinRoomBodySchema>;
export type QuickAddPlanBody = z.infer<typeof quickAddPlanBodySchema>;
export type CreateMemoryNoteBody = z.infer<typeof createMemoryNoteBodySchema>;

