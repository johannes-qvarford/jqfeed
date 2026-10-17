import type { NextConfig } from "next";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isUserOrOrganizationSite = repository?.endsWith(".github.io") ?? false;
const repositoryBasePath = repository && !isUserOrOrganizationSite ? `/${repository}` : "";
const basePath = process.env.PAGES_BASE_PATH ?? repositoryBasePath;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
