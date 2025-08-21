// src/config/env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Convert ES module URL to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your root .env file path
const envPath = path.resolve(__dirname, "../../.env");  // ✅ Correct relative path from src/config/env.js

dotenv.config({ path: envPath });

// Debug log to confirm
console.log("✅ ENV LOADED: GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);
