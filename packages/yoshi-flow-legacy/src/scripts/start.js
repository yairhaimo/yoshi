// Assign env vars before requiring anything so that it is available to all files
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const parseArgs = require('minimist');

const cliArgs = parseArgs(process.argv.slice(2), {
  alias: {
    https: 'ssl',
  },
  boolean: ['with-tests'],
  default: {
    https: false,
  },
});

if (cliArgs.production) {
  // run start with production configuration
  process.env.BABEL_ENV = 'production';
  process.env.NODE_ENV = 'production';
}

const { createRunner } = require('haste-core');
const path = require('path');
const crossSpawn = require('cross-spawn');
const LoggerPlugin = require('../plugins/haste-plugin-yoshi-logger');
const {
  clientFilesPath,
  servers,
  entry,
  hmr,
  liveReload,
  petriSpecsConfig,
  clientProjectName,
  startUrl,
} = require('yoshi-config');
const globs = require('yoshi-config/globs');
const {
  isTypescriptProject,
  shouldRunLess,
  shouldRunSass,
  isProduction,
} = require('yoshi-helpers/queries');
const { defaultEntry } = require('yoshi-helpers/constants');
const {
  shouldTransformHMRRuntime,
  suffix,
  watch,
  createBabelConfig,
} = require('yoshi-helpers/utils');
const { debounce } = require('lodash');
const wixAppServer = require('../tasks/app-server');
const openBrowser = require('./utils/open-browser');

const runner = createRunner({
  logger: new LoggerPlugin(),
});

const addJsSuffix = suffix('.js');
const shouldRunTests = cliArgs['with-tests'] === true;
const debugPort = cliArgs.debug;
const debugBrkPort = cliArgs['debug-brk'];
const entryPoint = addJsSuffix(cliArgs['entry-point'] || 'index.js');

module.exports = runner.command(
  async tasks => {
    const { sass, less, copy, clean, typescript } = tasks;

    const wixCdn = tasks[require.resolve('../tasks/cdn')];
    const babel = tasks[require.resolve('../tasks/babel')];
    const wixPetriSpecs = tasks[require.resolve('../tasks/petri-specs')];
    const wixMavenStatics = tasks[require.resolve('../tasks/maven-statics')];

    const appServer = async () => {
      if (cliArgs.server === false) {
        return;
      }

      return wixAppServer({
        entryPoint,
        debugPort,
        debugBrkPort,
        manualRestart: cliArgs['manual-restart'],
      });
    };

    await clean({ pattern: `{dist,target}/*` });

    const ssl = cliArgs.ssl || servers.cdn.ssl;

    const [localUrlForBrowser] = await Promise.all([
      transpileJavascriptAndRunServer(),
      ...transpileCss(),
      copy(
        {
          pattern: [
            ...globs.baseDirs.map(dir => `${dir}/assets/**/*`),
            ...globs.baseDirs.map(dir => `${dir}/**/*.{ejs,html,vm}`),
            ...globs.baseDirs.map(dir => `${dir}/**/*.{css,json,d.ts}`),
          ],
          target: 'dist',
        },
        { title: 'copy-server-assets', log: false },
      ),
      copy(
        {
          pattern: [
            ...globs.assetsLegacyBaseDirs.map(dir => `${dir}/assets/**/*`),
            ...globs.assetsLegacyBaseDirs.map(
              dir => `${dir}/**/*.{ejs,html,vm}`,
            ),
          ],
          target: 'dist/statics',
        },
        { title: 'copy-static-assets-legacy', log: false },
      ),
      copy(
        {
          pattern: [`assets/**/*`, `**/*.{ejs,html,vm}`],
          source: globs.assetsBase,
          target: 'dist/statics',
        },
        { title: 'copy-static-assets', log: false },
      ),
      wixCdn(
        {
          port: servers.cdn.port,
          host: '0.0.0.0',
          ssl,
          publicPath: servers.cdn.url,
          statics: clientFilesPath,
          webpackConfigPath: require.resolve(
            '../../config/webpack.config.client',
          ),
          configuredEntry: entry,
          defaultEntry: defaultEntry,
          hmr,
          liveReload,
          transformHMRRuntime: shouldTransformHMRRuntime(),
        },
        { title: 'cdn' },
      ),
      wixPetriSpecs(
        { config: petriSpecsConfig },
        { title: 'petri-specs', log: false },
      ),
      wixMavenStatics(
        {
          clientProjectName,
          staticsDir: clientFilesPath,
        },
        { title: 'maven-statics', log: false },
      ),
    ]);

    const urlToOpen = cliArgs.url || startUrl || localUrlForBrowser;

    if (urlToOpen) {
      openBrowser(urlToOpen);
    }

    if (shouldRunTests && !isProduction()) {
      crossSpawn('npm', ['test', '--silent'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          WIX_NODE_BUILD_WATCH_MODE: 'true',
        },
      });
    }

    watch(
      {
        pattern: [
          ...globs.baseDirs.map(dir => `${dir}/assets/**/*`),
          ...globs.baseDirs.map(dir => `${dir}/**/*.{ejs,html,vm}`),
          ...globs.baseDirs.map(dir => `${dir}/**/*.{css,json,d.ts}`),
        ],
      },
      changed => copy({ pattern: changed, target: 'dist' }),
    );

    watch(
      {
        pattern: [
          ...globs.assetsLegacyBaseDirs.map(dir => `${dir}/assets/**/*`),
          ...globs.assetsLegacyBaseDirs.map(dir => `${dir}/**/*.{ejs,html,vm}`),
        ],
      },
      changed => copy({ pattern: changed, target: 'dist/statics' }),
    );

    watch(
      {
        pattern: [`assets/**/*`, `**/*.{ejs,html,vm}`],
        cwd: path.resolve(globs.assetsBase),
      },
      changed =>
        copy({
          pattern: changed,
          target: 'dist/statics',
          source: globs.assetsBase,
        }),
    );

    function transpileCss() {
      if (shouldRunSass()) {
        watch({ pattern: globs.scss }, changed =>
          sass({
            pattern: changed,
            target: 'dist',
            options: {
              includePaths: ['node_modules', 'node_modules/compass-mixins/lib'],
            },
          }),
        );
      }

      if (shouldRunLess()) {
        watch({ pattern: globs.less }, changed =>
          less({
            pattern: changed,
            target: 'dist',
            paths: ['.', 'node_modules'],
          }),
        );
      }

      return [
        !shouldRunSass()
          ? null
          : sass({
              pattern: globs.scss,
              target: 'dist',
              options: {
                includePaths: [
                  'node_modules',
                  'node_modules/compass-mixins/lib',
                ],
              },
            }),
        !shouldRunLess()
          ? null
          : less({
              pattern: globs.less,
              target: 'dist',
              paths: ['.', 'node_modules'],
            }),
      ].filter(a => a);
    }

    async function transpileJavascriptAndRunServer() {
      if (isTypescriptProject()) {
        await typescript({
          watch: true,
          project: 'tsconfig.json',
          rootDir: '.',
          outDir: './dist/',
        });

        await watch(
          { pattern: [path.join('dist', '**', '*.js'), 'index.js'] },
          debounce(appServer, 500, { maxWait: 1000 }),
        );

        return appServer();
      }

      const baseBabelConfig = createBabelConfig();

      const babelConfig = {
        ...baseBabelConfig,
        sourceMaps: true,
        target: 'dist',
      };

      watch({ pattern: globs.babel }, async changed => {
        await babel(
          {
            pattern: changed,
            ...babelConfig,
          },
          { title: 'babel' },
        );
        return appServer();
      });

      await babel(
        {
          pattern: globs.babel,
          ...babelConfig,
        },
        { title: 'babel' },
      );

      return appServer();
    }
  },
  { persistent: true },
);
