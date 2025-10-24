/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle optional WebSocket dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'utf-8-validate': false,
        'bufferutil': false,
      };
    }
    
    // Ignore WebSocket optional dependencies warnings and punycode deprecation
    config.ignoreWarnings = [
      /Module not found: Can't resolve 'utf-8-validate'/,
      /Module not found: Can't resolve 'bufferutil'/,
      /Critical dependency: the request of a dependency is an expression/,
    ];
    
    return config;
  },
  // Suppress dev overlay for optional dependency warnings
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
