import type { PersonalEntitySpec, PersonalModuleKind } from "@alfy2/shared";

/**
 * The Personal OS catalog: the entity types across the twelve life modules, each mapped to a memory
 * kind with its required/optional fields. This is what tells the engine WHAT to remember and WHICH
 * fields to ask for once. Extend freely — it's data. See docs/PERSONAL_OS.md.
 */

const e = (
  module: PersonalModuleKind,
  entity_type: string,
  name: string,
  memory_kind: PersonalEntitySpec["memory_kind"],
  required_fields: string[],
  optional_fields: string[] = [],
): PersonalEntitySpec => ({ module, entity_type, name, memory_kind, required_fields, optional_fields });

export const PERSONAL_CATALOG: PersonalEntitySpec[] = [
  // Vehicles — including the dealership example.
  e("vehicles", "vehicle", "Vehicle", "vehicle", ["make", "model", "year"], ["plate", "vin", "color", "mileage"]),
  e(
    "vehicles",
    "dealership",
    "Vehicle dealership / service center",
    "company",
    ["store", "phone", "advisor", "hours", "preferred_contact"],
    ["address", "service_history", "email"],
  ),

  // Travel.
  e("travel", "trip", "Trip", "trip", ["destination", "start_date", "end_date"], ["purpose", "confirmation"]),
  e("travel", "airline_loyalty", "Airline loyalty account", "account", ["airline", "member_number"], ["tier", "preferred_seat"]),
  e("travel", "hotel", "Hotel", "company", ["name", "phone"], ["address", "loyalty_number", "preferred_room"]),

  // Appointments.
  e("appointments", "appointment", "Appointment", "meeting", ["title", "when", "provider"], ["location", "notes"]),
  e("appointments", "provider", "Service provider", "company", ["name", "phone", "hours"], ["address", "preferred_contact"]),

  // Shopping.
  e("shopping", "store", "Store", "company", ["name", "phone"], ["address", "hours", "loyalty_number"]),
  e("shopping", "order", "Order / wishlist item", "task", ["item"], ["store", "price", "needed_by"]),

  // Pets.
  e("pets", "pet", "Pet", "pet", ["name", "species"], ["breed", "birthday", "microchip", "diet"]),
  e("pets", "vet", "Veterinarian", "company", ["name", "phone", "hours"], ["address", "preferred_contact", "pet"]),

  // Home.
  e("home", "residence", "Home", "home", ["address"], ["sqft", "year_built", "wifi", "alarm_code_ref"]),
  e("home", "service_provider", "Home service provider", "company", ["name", "phone", "service"], ["preferred_contact", "rate"]),

  // Insurance.
  e("insurance", "policy", "Insurance policy", "contract", ["insurer", "policy_number", "type"], ["premium", "renewal_date", "agent_phone"]),

  // Bills.
  e("bills", "bill", "Recurring bill", "subscription", ["payee", "amount", "cadence"], ["due_day", "autopay", "account_ref"]),

  // Maintenance.
  e("maintenance", "maintenance_task", "Maintenance task", "task", ["item", "cadence"], ["last_done", "provider", "next_due"]),

  // Health.
  e("health", "doctor", "Doctor", "doctor", ["name", "specialty", "phone"], ["clinic", "preferred_contact", "address"]),
  e("health", "medication", "Medication", "health_event", ["name"], ["dose", "schedule", "prescriber"]),

  // Goals.
  e("goals", "goal", "Goal", "goal", ["title", "target"], ["deadline", "why", "metric"]),

  // Relationships.
  e("relationships", "contact", "Person", "person", ["name"], ["relationship", "phone", "email", "birthday", "preferred_contact"]),
];

/** Find the catalog spec for a module + entity_type. */
export function findSpec(
  module: PersonalModuleKind,
  entity_type: string,
): PersonalEntitySpec | undefined {
  return PERSONAL_CATALOG.find((s) => s.module === module && s.entity_type === entity_type);
}

/** All twelve module kinds present in the catalog. */
export function catalogModules(): PersonalModuleKind[] {
  return [...new Set(PERSONAL_CATALOG.map((s) => s.module))];
}
