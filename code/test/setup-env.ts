import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

console.log("Loaded .env, GAC =", process.env.GOOGLE_APPLICATION_CREDENTIALS);
