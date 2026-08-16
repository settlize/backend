import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema as domainSchema } from "../db/schema.js";
import * as authSchema from "./auth-schema.js";

const client = postgres(process.env.DATABASE_URL ?? "");

const combinedSchema = { ...authSchema, ...domainSchema };

export const db = drizzle(client, { schema: combinedSchema });

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: combinedSchema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      defaultCurrency: { type: "string", defaultValue: "USD" },
    },
  },
});
