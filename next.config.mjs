/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  serverExternalPackages: ["pg", "@napi-rs/canvas"],
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  webpack: (config, { isServer }) => {
    // Force pdfjs-dist to use CommonJS build on server to avoid worker import issues
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};
    config.resolve.alias["pdfjs-dist/legacy/build/pdf.mjs"] = "pdfjs-dist/legacy/build/pdf.js";
    // Allow .mjs requests to fall back to .js
    config.resolve.extensionAlias = {
      ".mjs": [".mjs", ".js"],
    };

    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      externals.push({
        pg: "commonjs pg",
        "pg-native": "commonjs pg-native",
        "@napi-rs/canvas": "commonjs @napi-rs/canvas",
      });
      config.externals = externals;
    }
    return config;
  },
};

export default nextConfig;
