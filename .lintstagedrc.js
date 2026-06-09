const path = require("path");

// Single npm-run level: args after `--` only forward through one
// `npm run`, so target the workspace script directly.
const buildNextEslintCommand = (filenames) =>
  `npm run lint -w @se-2/nextjs -- --fix --file ${filenames
    .map((f) => path.relative(path.join("packages", "nextjs"), f))
    .join(" --file ")}`;

const checkTypesNextCommand = () => "npm run check-types -w @se-2/nextjs";

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
};
