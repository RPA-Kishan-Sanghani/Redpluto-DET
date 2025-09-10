
import { defineConfig } from "drizzle-kit";

// External PostgreSQL database configuration
const DATABASE_URL = "postgresql://rpdet_az:Rpdet#1234@4.240.90.166:5432/config_db";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
