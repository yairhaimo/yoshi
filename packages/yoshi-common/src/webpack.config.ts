type WebpackEntrypoints = {
  [bundle: string]: string | Array<string>;
};

export default async function getBaseWebpackConfig({
  isServer = false,
  isDev = false,
  entrypoints,
}: {
  isServer: boolean;
  isDev: boolean;
  entrypoints: WebpackEntrypoints;
}) {
  const styleLoaders = getStyleLoaders({
    app,
    embedCss: !isServer,
    isHmr,
    isDebug,
  });

  const config = {
    context: app.SRC_DIR,

    mode: !isDev ? 'production' : 'development',

    target: isServer ? 'node' : 'web',

    entry: entrypoints,

    output: {
      path: app.STATICS_DIR,
      publicPath: calculatePublicPath(app),
      pathinfo: isDebug,
      filename: isDebug
        ? addHashToAssetName('[name].bundle.js')
        : addHashToAssetName('[name].bundle.min.js'),
      chunkFilename: isDebug
        ? addHashToAssetName('[name].chunk.js')
        : addHashToAssetName('[name].chunk.min.js'),
      hotUpdateMainFilename: 'updates/[hash].hot-update.json',
      hotUpdateChunkFilename: 'updates/[id].[hash].hot-update.js',
    },

    resolve: {
      modules: ['node_modules', app.SRC_DIR],

      extensions,

      alias: app.resolveAlias,

      mainFields: ['svelte', 'browser', 'module', 'main'],

      // Whether to resolve symlinks to their symlinked location.
      symlinks: rootApp.experimentalMonorepo,
    },

    // Since Yoshi does not depend on every loader it uses directly, we first look
    // for loaders in Yoshi's `node_modules` and then look at the root `node_modules`
    //
    // See https://github.com/wix/yoshi/pull/392
    resolveLoader: {
      modules: [path.join(__dirname, '../node_modules'), 'node_modules'],
    },

    plugins: [
      // This gives some necessary context to module not found errors, such as
      // the requesting resource
      new ModuleNotFoundPlugin(app.ROOT_DIR),
      // https://github.com/Urthen/case-sensitive-paths-webpack-plugin
      new CaseSensitivePathsPlugin(),
      // Way of communicating to `babel-preset-yoshi` or `babel-preset-wix` that
      // it should optimize for Webpack
      new EnvironmentMarkPlugin(),
      // https://github.com/Realytics/fork-ts-checker-webpack-plugin
      ...(isTypescriptProject && app.projectType === 'app' && isDebug
        ? [
            // Since `fork-ts-checker-webpack-plugin` requires you to have
            // TypeScript installed when its required, we only require it if
            // this is a TypeScript project
            new (require('fork-ts-checker-webpack-plugin'))({
              tsconfig: app.TSCONFIG_FILE,
              async: false,
              silent: true,
              checkSyntacticErrors: true,
              formatter: typescriptFormatter,
            }),
          ]
        : []),
      ...(isHmr ? [new webpack.HotModuleReplacementPlugin()] : []),
    ],

    module: {
      // Makes missing exports an error instead of warning
      strictExportPresence: true,

      rules: [
        ...styleLoaders,

        // https://github.com/wix/externalize-relative-module-loader
        ...(app.features.externalizeRelativeLodash
          ? [
              {
                test: /[\\/]node_modules[\\/]lodash/,
                loader: 'externalize-relative-module-loader',
              },
            ]
          : []),

        // https://github.com/huston007/ng-annotate-loader
        ...(app.isAngularProject
          ? [
              {
                test: reScript,
                loader: 'yoshi-angular-dependencies/ng-annotate-loader',
                include: unprocessedModules,
              },
            ]
          : []),

        // Rules for TS / TSX
        {
          test: /\.(ts|tsx)$/,
          include: unprocessedModules,
          use: [
            {
              loader: 'thread-loader',
              options: {
                workers: require('os').cpus().length - 1,
              },
            },

            // https://github.com/huston007/ng-annotate-loader
            ...(app.isAngularProject
              ? [{ loader: 'yoshi-angular-dependencies/ng-annotate-loader' }]
              : []),

            {
              loader: 'ts-loader',
              options: {
                // This implicitly sets `transpileOnly` to `true`
                happyPackMode: true,
                compilerOptions: app.isAngularProject
                  ? {}
                  : {
                      // force es modules for tree shaking
                      module: 'esnext',
                      // use same module resolution
                      moduleResolution: 'node',
                      // optimize target to latest chrome for local development
                      ...(isDev
                        ? {
                            // allow using Promises, Array.prototype.includes, String.prototype.padStart, etc.
                            lib: ['es2017'],
                            // use async/await instead of embedding polyfills
                            target: 'es2017',
                          }
                        : {}),
                    },
              },
            },
          ],
        },

        // Rules for JS
        {
          test: reScript,
          include: unprocessedModules,
          use: [
            {
              loader: 'thread-loader',
              options: {
                workers: require('os').cpus().length - 1,
              },
            },
            {
              loader: 'babel-loader',
              options: {
                ...babelConfig,
              },
            },
          ],
        },

        // Rules for assets
        {
          oneOf: [
            // Inline SVG images into CSS
            {
              test: /\.inline\.svg$/,
              loader: 'svg-inline-loader',
            },

            // Allows you to use two kinds of imports for SVG:
            // import logoUrl from './logo.svg'; gives you the URL.
            // import { ReactComponent as Logo } from './logo.svg'; gives you a component.
            {
              test: /\.svg$/,
              issuer: {
                test: /\.(j|t)sx?$/,
              },
              use: [
                {
                  loader: '@svgr/webpack',
                  options: {
                    svgoConfig: {
                      plugins: {
                        removeViewBox: false,
                      },
                    },
                  },
                },
                {
                  loader: 'svg-url-loader',
                  options: {
                    iesafe: true,
                    noquotes: true,
                    limit: 10000,
                    name: staticAssetName,
                  },
                },
              ],
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: 'svg-url-loader',
                  options: {
                    iesafe: true,
                    limit: 10000,
                    name: staticAssetName,
                  },
                },
              ],
            },

            {
              test: /\.carmi.js$/,
              exclude: /node_modules/,
              // Not installed by Yoshi and should be installed by the project that needs it.
              // https://github.com/wix-incubator/carmi
              loader: 'carmi/loader',
            },

            // Rules for Markdown
            {
              test: /\.md$/,
              loader: 'raw-loader',
            },

            // Rules for HAML
            {
              test: /\.haml$/,
              loader: 'ruby-haml-loader',
            },

            // Rules for HTML
            {
              test: /\.html$/,
              loader: 'html-loader',
            },

            // Rules for GraphQL
            {
              test: /\.(graphql|gql)$/,
              loader: 'graphql-tag/loader',
            },

            // Try to inline assets as base64 or return a public URL to it if it passes
            // the 10kb limit
            {
              test: reAssets,
              loader: 'url-loader',
              options: {
                name: staticAssetName,
                limit: 10000,
              },
            },
          ],
        },
      ],
    },

    // https://webpack.js.org/configuration/stats/
    stats: 'none',

    // https://github.com/webpack/node-libs-browser/tree/master/mock
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      __dirname: true,
    },

    // https://webpack.js.org/configuration/devtool
    // If we are in CI or requested explicitly we create full source maps
    // Once we are in a local build, we create cheap eval source map only
    // for a development build (hence the !isProduction)
    devtool:
      inTeamCity || withLocalSourceMaps
        ? 'source-map'
        : !isDev
        ? 'cheap-module-eval-source-map'
        : false,
  };

  return config;
}
