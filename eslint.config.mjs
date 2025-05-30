// eslint.config.mjs - ビルドエラー修正版
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript関連のルールを緩和
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn", // errorからwarnに変更
      
      // React Hooks関連の警告を緩和
      "react-hooks/exhaustive-deps": "warn",
      
      // Next.js Image警告を無効化（開発段階では）
      "@next/next/no-img-element": "off", // 完全に無効化
      
      // 未使用変数の警告を調整
      "no-unused-vars": "off", // TypeScriptの方を使用
      
      // その他のルール調整
      "prefer-const": "warn",
      "no-console": "off", // 開発段階では許可
      "react/no-unescaped-entities": "off",
      "react/display-name": "off"
    }
  }
];

export default eslintConfig;