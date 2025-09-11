module.exports = {
  webpack: function webpack(config, env) {
    const webpack = require('webpack')
    // Allow extension-less ESM imports in node_modules (e.g., MUI)
    config.resolve.fullySpecified = false
    config.resolve.fallback = {
      buffer: require.resolve('buffer'),
      stream: require.resolve('stream-browserify'),
    }

    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
    )

    config.devServer = { host: 'local-ipv4' }

    // If `TAURI_PLATFORM_TYPE` is present in the environment, we're building for Tauri.
    //  Our entry point should be `index-tauri.js` instead of `index.js`
    if (process.env.TAURI_PLATFORM_TYPE) {
      config.entry = config.entry.replace('index.js', 'index-tauri.js')
    }

    // Silence source-map-loader errors for missing source maps in deps
    const walk = (rules) => {
      rules.forEach((r) => {
        if (r && r.use) {
          r.use.forEach((u) => {
            if (u && u.loader && u.loader.includes('source-map-loader')) {
              u.exclude = /node_modules/ // ignore node_modules
            }
          })
        }
        if (r && r.oneOf) walk(r.oneOf)
        if (r && r.rules) walk(r.rules)
      })
    }
    if (config.module && Array.isArray(config.module.rules)) {
      walk(config.module.rules)
    }

    return config
  },
  jest: function jest(config) {
    config.testMatch = ['<rootDir>/src/**/__tests__/**/*.js', '<rootDir>/src/**/*.{spec,test}.js']

    config.transformIgnorePatterns = []
    config.watchPathIgnorePatterns = ['cache.json']

    // console.log(config)
    // process.exit()
    return config
  },
}
