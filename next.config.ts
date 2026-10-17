import type { NextConfig } from 'next';
import path from 'node:path';
const runtimePath=path.resolve('db/runtime-vercel.ts');
const nextConfig: NextConfig = {
  // Keep API routes server-rendered. No static export and no custom distDir.
  webpack(config, { webpack }) {
    config.resolve.alias={...config.resolve.alias,'@/db/runtime':runtimePath};
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@\/db\/runtime$/, runtimePath));
    return config;
  },
  turbopack:{resolveAlias:{'@/db/runtime':'./db/runtime-vercel.ts'}},
};
export default nextConfig;
