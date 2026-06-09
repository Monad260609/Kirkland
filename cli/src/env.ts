import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// dotenv never overwrites vars that are already set, so precedence is:
// real environment > .env in the invoking directory > the CLI package's .env
config();
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });
