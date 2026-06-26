import {
  CreateBusinessInputSchema,
  BusinessSchema,
  type CreateBusinessInput,
  type Business,
  type BusinessDepartment,
  type DepartmentKind,
} from "@alfy2/shared";
import { getBusinessTemplate, BUSINESS_TEMPLATE_VERSION } from "./template.js";

/**
 * The Business Factory. Instantiates a Business from the canonical template so every business
 * inherits the SAME framework (the twelve departments), while assigning a unique `business_id` and
 * `data_namespace` so each business's data is ISOLATED. Pure — it builds and returns the Business;
 * persistence happens elsewhere (Supabase `businesses`/`business_departments`, tenant RLS +
 * business_id). See docs/adr/ADR-0006-business-template.md.
 */

export interface BusinessFactoryOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class BusinessFactory {
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: BusinessFactoryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Create a fully-formed business with all twelve departments, scoped to a fresh business_id. */
  create(tenantId: string, input: CreateBusinessInput): Business {
    const parsed = CreateBusinessInputSchema.parse(input);
    const version = parsed.template_version ?? BUSINESS_TEMPLATE_VERSION;
    const template = getBusinessTemplate(version);

    const id = this.newId();
    const slug = parsed.slug ?? slugify(parsed.name);

    // Deep-clone each shared spec so a business can never mutate the canonical framework, then scope
    // it to this business. Same framework in, isolated instance out.
    const departments: BusinessDepartment[] = template.departments.map((spec) => ({
      ...structuredClone(spec),
      business_id: id,
      status: "active" as const,
    }));

    const business: Business = {
      id,
      tenant_id: tenantId,
      name: parsed.name,
      slug,
      data_namespace: `biz:${slug}-${id.slice(0, 8)}`,
      template_version: version,
      status: "active",
      departments,
      created_at: this.clock().toISOString(),
    };

    return BusinessSchema.parse(business);
  }

  /** Convenience: pull one department out of a business by kind. */
  static department(business: Business, kind: DepartmentKind): BusinessDepartment {
    const dept = business.departments.find((d) => d.kind === kind);
    if (!dept) throw new Error(`Business ${business.id} has no ${kind} department`);
    return dept;
  }
}

function slugify(name: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (slug === "") slug = "business";
  if (!/^[a-z]/.test(slug)) slug = `b-${slug}`;
  return slug;
}
