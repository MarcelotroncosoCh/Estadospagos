import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const paymentProcesses = sqliteTable("payment_processes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  deadline: text("deadline").notNull(),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const catalogEntries = sqliteTable("catalog_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["provider", "project", "motive"] }).notNull(),
  name: text("name").notNull(),
  projectType: text("project_type"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("catalog_kind_name_type_uq").on(table.kind, table.name, table.projectType),
]);

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  processId: text("process_id").notNull().default("2026-07-2"),
  paymentPeriod: text("payment_period").notNull().default("2026-07-31T17:00:00-04:00"),
  waitingForPeriod: integer("waiting_for_period", { mode: "boolean" }).notNull().default(false),
  requester: text("requester").notNull(),
  requesterEmail: text("requester_email"),
  department: text("department").notNull(),
  provider: text("provider").notNull(),
  projectType: text("project_type").notNull(),
  project: text("project").notNull(),
  motive: text("motive").notNull(),
  comment: text("comment").notNull().default(""),
  status: text("status", { enum: ["Recibida", "En proceso", "Pendiente", "Pagada"] }).notNull().default("Recibida"),
  paidAmount: integer("paid_amount"),
  paymentDate: text("payment_date"),
  notifiedAt: text("notified_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("submissions_department_idx").on(table.department),
  index("submissions_status_idx").on(table.status),
  index("submissions_process_idx").on(table.processId),
  index("submissions_department_period_idx").on(table.department, table.paymentPeriod),
  index("submissions_waiting_idx").on(table.waitingForPeriod),
  index("submissions_notification_idx").on(table.paymentPeriod, table.status, table.notifiedAt),
]);

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  objectKey: text("object_key").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("documents_submission_idx").on(table.submissionId),
]);
