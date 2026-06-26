import { z } from "zod";

/**
 * Global Asset Library contracts. Every business has assets; this is the single, tenant-scoped,
 * permission-aware, globally-searchable catalog of all of them. Each asset carries owner, business,
 * version, relationships, tags, status, approval, location, usage history, and search keywords.
 * Search spans all businesses in a tenant but is filtered by the requester's permissions (private and
 * sensitive assets are gated). See docs/adr/ADR-0014-global-asset-library.md. Mirrored in workers.
 */

/** The kinds of asset a business can have. */
export const AssetTypeSchema = z.enum([
  "logo",
  "brand_guide",
  "domain",
  "social_media",
  "pitch_deck",
  "investor_deck",
  "sales_deck",
  "contract",
  "nda",
  "sop",
  "email_template",
  "landing_page",
  "automation",
  "github_repo",
  "api_key",
  "product_spec",
  "video",
  "photo",
  "training",
  "pricing",
  "vendor_list",
  "customer_list",
  "marketing_campaign",
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetStatusSchema = z.enum(["draft", "active", "archived", "deprecated"]);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

export const ApprovalStateSchema = z.enum(["not_required", "pending", "approved", "rejected"]);
export type ApprovalState = z.infer<typeof ApprovalStateSchema>;

export const AssetVisibilitySchema = z.enum(["tenant", "business", "private"]);
export type AssetVisibility = z.infer<typeof AssetVisibilitySchema>;

export const AssetRelationSchema = z.enum([
  "derived_from",
  "version_of",
  "used_by",
  "references",
  "supersedes",
  "related_to",
]);
export type AssetRelation = z.infer<typeof AssetRelationSchema>;

export const AssetRelationshipSchema = z.object({
  relation: AssetRelationSchema,
  target_asset_id: z.string().uuid(),
});
export type AssetRelationship = z.infer<typeof AssetRelationshipSchema>;

/** One entry in an asset's usage history. */
export const AssetUsageSchema = z.object({
  at: z.string().datetime(),
  actor: z.string().min(1),
  action: z.string().min(1), // viewed | downloaded | sent | edited | shared | used
});
export type AssetUsage = z.infer<typeof AssetUsageSchema>;

/** A catalogued asset. */
export const AssetSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  type: AssetTypeSchema,
  name: z.string().min(1),
  description: z.string().default(""),
  /** The principal who owns it. */
  owner: z.string().min(1),
  /** The business it belongs to; null = tenant-wide. */
  business_id: z.string().nullable().default(null),
  version: z.string().default("1.0.0"),
  status: AssetStatusSchema.default("active"),
  approval: ApprovalStateSchema.default("not_required"),
  approved_by: z.string().nullable().default(null),
  /** Where it lives: URL, file path, connector ref, or secret ref (never the secret itself). */
  location: z.string().min(1),
  /** Sensitive assets (e.g. api_key) are gated to higher roles regardless of visibility. */
  sensitive: z.boolean().default(false),
  visibility: AssetVisibilitySchema.default("business"),
  tags: z.array(z.string()).default([]),
  relationships: z.array(AssetRelationshipSchema).default([]),
  usage_history: z.array(AssetUsageSchema).default([]),
  /** Search keywords (the search index is built from name/description/tags/keywords). */
  keywords: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type Asset = z.infer<typeof AssetSchema>;

/** Input to create an asset (defaults applied by the engine). */
export const CreateAssetInputSchema = z.object({
  type: AssetTypeSchema,
  name: z.string().min(1),
  description: z.string().default(""),
  owner: z.string().min(1),
  business_id: z.string().nullable().default(null),
  version: z.string().default("1.0.0"),
  status: AssetStatusSchema.default("active"),
  approval: ApprovalStateSchema.default("not_required"),
  location: z.string().min(1),
  sensitive: z.boolean().default(false),
  visibility: AssetVisibilitySchema.default("business"),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});
export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;

/** A global, permission-aware search query. */
export const AssetQuerySchema = z.object({
  /** The principal performing the search — results are filtered to what they may see. */
  principal: z.string().min(1),
  text: z.string().optional(),
  types: z.array(AssetTypeSchema).default([]),
  business_id: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  status: AssetStatusSchema.optional(),
  owner: z.string().optional(),
  limit: z.number().int().positive().max(200).default(20),
});
export type AssetQuery = z.infer<typeof AssetQuerySchema>;

/** A single permitted search hit. */
export const AssetSearchHitSchema = z.object({
  asset_id: z.string().uuid(),
  name: z.string().min(1),
  type: AssetTypeSchema,
  business_id: z.string().nullable().default(null),
  score: z.number().min(0).max(1),
  snippet: z.string().default(""),
});
export type AssetSearchHit = z.infer<typeof AssetSearchHitSchema>;
