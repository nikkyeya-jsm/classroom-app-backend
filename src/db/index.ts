import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as authSchema from "./schemas/auth.js";
import * as appSchema from "./schemas/app.js";

config({ path: ".env" }); // or .env.local

const sql = neon(process.env.DATABASE_URL!);
const schema = { ...authSchema, ...appSchema };

export const db = drizzle({ client: sql, schema });
