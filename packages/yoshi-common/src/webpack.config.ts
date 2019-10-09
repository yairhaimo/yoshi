export default async function getBaseWebpackConfig() {
  const resolveConfig = {
    modules: ['node_modules', app.SRC_DIR],

    extensions,

    alias: app.resolveAlias,

    // Whether to resolve symlinks to their symlinked location.
    symlinks: rootApp.experimentalMonorepo,
  };

  const terserOptions = {
    // Use multi-process parallel running to improve the build speed
    // Default number of concurrent runs: os.cpus().length - 1
    parallel: true,
    // Enable file caching
    cache: true,
    sourceMap: true,
    terserOptions: {
      output: {
        // support emojis
        ascii_only: true,
      },
      keep_fnames: app.keepFunctionNames,
    },
  };

  const webpackConfig = {};

  return webpackConfig;
}
