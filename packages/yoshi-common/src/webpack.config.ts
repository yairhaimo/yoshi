import path from 'path';
import webpack from 'webpack';
import { SRC_DIR, STATICS_DIR, TSCONFIG_FILE } from 'yoshi-config/paths';
import {
  isProduction as checkIsProduction,
  inTeamCity as checkInTeamCity,
} from 'yoshi-helpers/queries';
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import {
  unprocessedModules,
  createBabelConfig,
  toIdentifier,
  getProjectArtifactId,
} from 'yoshi-helpers/utils';
import TerserPlugin from 'terser-webpack-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import WriteFilePlugin from 'write-file-webpack-plugin';
import { resolveNamespaceFactory } from '@stylable/node';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

type WebpackEntrypoints = {
  [bundle: string]: string | Array<string>;
};

const isProduction = checkIsProduction();
const inTeamCity = checkInTeamCity();

const babelConfig = createBabelConfig({ modules: false });

const artifactVersion = process.env.ARTIFACT_VERSION;
const disableModuleConcat = process.env.DISABLE_MODULE_CONCATENATION === 'true';

const reScript = /\.js?$/;
const reStyle = /\.(css|less|scss|sass)$/;
const reAssets = /\.(png|jpg|jpeg|gif|woff|woff2|ttf|otf|eot|wav|mp3)$/;

const staticAssetName = 'media/[name].[hash:8].[ext]';

export default async function getBaseWebpackConfig({
  name,
  target,
  isDev = false,
  isHot = false,
  isTypeScript = false,
  isTypecheck = false,
  isAngular = false,
  isSeparateCss = false,
  keepFunctionNames = false,
  forceFullSourceMaps = false,
  cwd = process.cwd(),
  publicPath,
  entrypoints,
  resolveAlias,
}: {
  name: string;
  target: 'web' | 'node' | 'webworker';
  isDev?: boolean;
  isHot?: boolean;
  isTypeScript?: boolean;
  isTypecheck?: boolean;
  isAngular?: boolean;
  isSeparateCss: boolean;
  keepFunctionNames?: boolean;
  forceFullSourceMaps?: boolean;
  cwd?: string;
  publicPath: string;
  entrypoints: WebpackEntrypoints;
  resolveAlias: { [key: string]: string };
}): Promise<webpack.Configuration> {
  const join = (...dirs: Array<string>) => path.join(cwd, ...dirs);

  const config: webpack.Configuration = {
    context: join(SRC_DIR),

    target,

    entry: entrypoints,

    mode: isProduction ? 'production' : 'development',

    output: {
      path: join(STATICS_DIR),
      publicPath,
      pathinfo: isDev,
      filename: isDev ? '[name].bundle.js' : '[name].bundle.min.js',
      chunkFilename: isDev ? '[name].chunk.js' : '[name].chunk.min.js',
      hotUpdateMainFilename: 'updates/[hash].hot-update.json',
      hotUpdateChunkFilename: 'updates/[id].[hash].hot-update.js',

      // https://github.com/wix/yoshi/pull/497
      jsonpFunction: `webpackJsonp_${toIdentifier(name)}`,
    },

    resolve: {
      modules: ['node_modules', join(SRC_DIR)],
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.svelte', '.json'],
      alias: resolveAlias,
      mainFields: ['svelte', 'browser', 'module', 'main'],
    },

    // Since Yoshi does not depend on every loader it uses directly, we first look
    // for loaders in Yoshi's `node_modules` and then look at the root `node_modules`
    resolveLoader: {
      modules: [path.join(__dirname, '../node_modules'), 'node_modules'],
    },

    optimization: {
      minimize: !isDev,
      concatenateModules: isProduction && !disableModuleConcat,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          cache: true,
          sourceMap: true,
          terserOptions: {
            output: {
              ascii_only: true,
            },
            keep_fnames: keepFunctionNames,
          },
        }),
        new OptimizeCSSAssetsPlugin(),
      ],

      splitChunks: false,
    },

    plugins: [
      new ModuleNotFoundPlugin(cwd),
      new CaseSensitivePathsPlugin(),
      ...(isTypeScript && isTypecheck && isDev
        ? [
            new (await import('fork-ts-checker-webpack-plugin')).default({
              tsconfig: join(TSCONFIG_FILE),
              async: false,
              silent: true,
              checkSyntacticErrors: true,
              formatter: await import('react-dev-utils/typescriptFormatter'),
            }),
          ]
        : []),
      ...(isHot ? [new webpack.HotModuleReplacementPlugin()] : []),
      ...(target !== 'node'
        ? [
            new webpack.DefinePlugin({
              'process.env.NODE_ENV': JSON.stringify(
                isProduction ? 'production' : 'development',
              ),
              'process.env.IS_MINIFIED': JSON.stringify(!isDev),
              'window.__CI_APP_VERSION__': JSON.stringify(
                artifactVersion ? artifactVersion : '0.0.0',
              ),
              'process.env.ARTIFACT_ID': JSON.stringify(getProjectArtifactId()),
            }),
          ]
        : []),
      ...(target === 'web'
        ? [
            new WriteFilePlugin({
              exitOnErrors: false,
              log: false,
              useHashIndex: false,
            }),
            new webpack.LoaderOptionsPlugin({
              minimize: !isDev,
            }),
            ...(isSeparateCss
              ? [
                  new MiniCssExtractPlugin({
                    filename: isDev ? '[name].css' : '[name].min.css',
                    chunkFilename: isDev
                      ? '[name].chunk.css'
                      : '[name].chunk.min.css',
                  }),
                  ...(app.enhancedTpaStyle
                    ? [new TpaStyleWebpackPlugin()]
                    : []),
                  ...(!rootApp.experimentalBuildHtml &&
                  !rootApp.experimentalRtlCss
                    ? [
                        new RtlCssPlugin(
                          isDev ? '[name].rtl.css' : '[name].rtl.min.css',
                        ),
                      ]
                    : []),
                ]
              : []),

            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

            new StylableWebpackPlugin({
              outputCSS: stylableSeparateCss,
              filename: '[name].stylable.bundle.css',
              includeCSSInJS: !stylableSeparateCss,
              optimize: {
                classNameOptimizations: false,
                shortNamespaces: false,
              },
              runtimeMode: 'shared',
              globalRuntimeId: '__stylable_yoshi__',
              generate: {
                runtimeStylesheetId: 'namespace',
              },
              resolveNamespace: resolveNamespaceFactory(name),
            }),
          ]
        : []),
    ],

    module: {
      // Makes missing exports an error instead of warning
      strictExportPresence: true,

      rules: [
        ...(isAngular
          ? [
              {
                test: reScript,
                loader: 'yoshi-angular-dependencies/ng-annotate-loader',
                include: unprocessedModules,
              },
            ]
          : []),

        {
          test: /\.(ts|tsx)$/,
          include: unprocessedModules,
          use: [
            {
              loader: 'thread-loader',
              options: {
                workers: (await import('os')).cpus().length - 1,
              },
            },

            ...(isAngular
              ? [{ loader: 'yoshi-angular-dependencies/ng-annotate-loader' }]
              : []),

            {
              loader: 'ts-loader',
              options: {
                happyPackMode: true,
                compilerOptions: isAngular
                  ? {}
                  : {
                      module: 'esnext',
                      moduleResolution: 'node',
                      ...(isDev
                        ? {
                            lib: ['es2017'],
                            target: 'es2017',
                          }
                        : {}),
                    },
              },
            },
          ],
        },

        {
          test: reScript,
          include: unprocessedModules,
          use: [
            {
              loader: 'thread-loader',
              options: {
                workers: (await import('os')).cpus().length - 1,
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

        {
          oneOf: [
            {
              test: /\.inline\.svg$/,
              loader: 'svg-inline-loader',
            },

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

            {
              test: /\.md$/,
              loader: 'raw-loader',
            },

            {
              test: /\.haml$/,
              loader: 'ruby-haml-loader',
            },

            {
              test: /\.html$/,
              loader: 'html-loader',
            },

            {
              test: /\.(graphql|gql)$/,
              loader: 'graphql-tag/loader',
            },

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

    stats: 'none',

    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      __dirname: true,
    },

    devtool:
      inTeamCity || forceFullSourceMaps
        ? 'source-map'
        : !isProduction
        ? 'cheap-module-eval-source-map'
        : false,
  };

  return config;
}
