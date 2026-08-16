import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { account, session, user, verification } from "../lib/auth-schema.js";

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  defaultCurrency: text("default_currency").default("USD").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index("group_members_user_id_idx").on(table.userId),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    paidById: text("paid_by_id")
      .notNull()
      .references(() => user.id),
    date: timestamp("date").notNull(),
    category: text("category").default("general").notNull(),
    splitType: text("split_type").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("expenses_group_id_date_idx").on(table.groupId, table.date),
  ],
);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    shareValue: integer("share_value").notNull(),
    computedShare: integer("computed_share").notNull(),
  },
  (table) => [
    uniqueIndex("expense_splits_expense_id_user_id_key").on(
      table.expenseId,
      table.userId,
    ),
    index("expense_splits_user_id_idx").on(table.userId),
  ],
);

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    payerId: text("payer_id")
      .notNull()
      .references(() => user.id),
    payeeId: text("payee_id")
      .notNull()
      .references(() => user.id),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    date: timestamp("date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("settlements_group_id_idx").on(table.groupId)],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rate: integer("rate").notNull(),
    fetchedAt: timestamp("fetched_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.base, table.quote] })],
);

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  extractedJson: text("extracted_json"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [groupMembers.userId],
    references: [user.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many, one }) => ({
  members: many(groupMembers),
  expenses: many(expenses),
  createdByUser: one(user, {
    fields: [groups.createdBy],
    references: [user.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  paidBy: one(user, {
    fields: [expenses.paidById],
    references: [user.id],
  }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  user: one(user, {
    fields: [expenseSplits.userId],
    references: [user.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, {
    fields: [settlements.groupId],
    references: [groups.id],
  }),
  payer: one(user, {
    fields: [settlements.payerId],
    references: [user.id],
    relationName: "settlements_payer",
  }),
  payee: one(user, {
    fields: [settlements.payeeId],
    references: [user.id],
    relationName: "settlements_payee",
  }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  expense: one(expenses, {
    fields: [receipts.expenseId],
    references: [expenses.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  groups,
  groupMembers,
  expenses,
  expenseSplits,
  settlements,
  fxRates,
  receipts,
};
