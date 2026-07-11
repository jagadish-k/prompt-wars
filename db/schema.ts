import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const dwellingEnum = pgEnum('dwelling_type', ['ground_floor', 'high_rise', 'independent_house'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  preferredLanguage: text('preferred_language').default('en').notNull(),
  householdSize: integer('household_size').default(1).notNull(),
  dwellingType: dwellingEnum('dwelling_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const monitoredLocations = pgTable('monitored_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationName: text('location_name').notNull(),
  latitude: text('latitude').notNull(), // stored as text to preserve precision
  longitude: text('longitude').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
})

export const vulnerabilities = pgTable('vulnerabilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
})

export const preparednessPlans = pgTable('preparedness_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => monitoredLocations.id),
  planData: jsonb('plan_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
