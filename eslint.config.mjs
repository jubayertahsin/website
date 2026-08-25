import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // tools/ is run directly by node, not bundled by Next, so the app's rules
    // about client boundaries and imports do not apply to it.
    //
    // next-env.d.ts and .next/ are written by Next itself. The generated file says
    // in its own comment that it must not be edited, and since Next 15.5 it carries
    // a triple-slash path reference that next/typescript flags — so linting it can
    // only ever report a fault nobody is allowed to fix. `next lint` skipped it by
    // convention; the ESLint CLI lints whatever it is pointed at, so the exclusion
    // has to be stated.
    ignores: [".next/**", "next-env.d.ts", "node_modules/**", "tools/**"],
  },
];

export default eslintConfig;
