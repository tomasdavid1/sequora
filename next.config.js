/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude server-only packages from bundling
  experimental: {
    serverComponentsExternalPackages: ['twilio'],
  },
  webpack: (config, { isServer }) => {
    // Handle optional WebSocket dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'utf-8-validate': false,
        'bufferutil': false,
      };
    }
    
    // Ignore WebSocket optional dependencies warnings, ESM externals, and punycode deprecation
    config.ignoreWarnings = [
      /Module not found: Can't resolve 'utf-8-validate'/,
      /Module not found: Can't resolve 'bufferutil'/,
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: ESM packages \(supports-color\) need to be imported/,
    ];
    
    return config;
  },
  // Suppress dev overlay for optional dependency warnings
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
