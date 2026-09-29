import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// eslint-config-next 15 chưa xuất flat config — bọc qua FlatCompat.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Component prototype VYBE có sẵn `as any` (12 chỗ) từ trước khi có lint. Tạm cảnh báo
    // thay vì chặn build; sửa dần khi từng màn hình được làm lại theo backlog.
    files: [
      "components/BuyerDirectory.tsx",
      "components/BuyerSellerDetail.tsx",
      "components/Footer.tsx",
      "components/Header.tsx",
      "components/HomePage.tsx",
      "components/SellerOnboarding.tsx",
      "components/SellerWorkspace.tsx",
      "components/SolutionsPage.tsx",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/api/schema.d.ts",
  ]),
];

export default eslintConfig;
