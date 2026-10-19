import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] || "tgminiapp-ege";
const basePath = isGitHubPages ? `/${repositoryName}` : "";

const config: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(isGitHubPages ? { output: "export", basePath, trailingSlash: true } : {}),
};
export default config;
