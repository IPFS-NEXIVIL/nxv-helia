const { ProvidePlugin } = require("webpack");
module.exports = {
  webpack: function override(config, env) {
    // if (config.resolve.alias)
    config.resolve.alias = {
      ...config.resolve.alias,
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
    };
    config.plugins.push(
      new ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      })
    );
    config.module.rules = config.module.rules.map((rule) => {
      if (rule.oneOf instanceof Array) {
        // eslint-disable-next-line no-param-reassign
        rule.oneOf[rule.oneOf.length - 1].exclude = [
          /\.(js|mjs|jsx|cjs|ts|tsx)$/,
          /\.html$/,
          /\.json$/,
        ];
      }
      return rule;
    });
    return config;
  },
};
