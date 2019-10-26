import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import webpack from 'webpack';
import globby from 'globby';
import clearConsole from 'react-dev-utils/clearConsole';
import { prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
// import rootApp from 'yoshi-config/root-app';
import Watchpack from 'watchpack';
import { shouldDeployToCDN, inTeamCity } from 'yoshi-helpers/queries';
import { getProjectCDNBasePath } from 'yoshi-helpers/utils';
import { SRC_DIR, ROUTES_DIR } from 'yoshi-config/paths';
import { PORT } from './utils/constants';

const isDevelopment = process.env.NODE_ENV === 'development';

const isInteractive = process.stdout.isTTY;
const possibleServerEntries = ['./server', '../dev/server'];

function createCompiler(
  webpackConfig: webpack.Configuration,
  { https, port }: { https: boolean; port: number },
) {
  let compiler: webpack.Compiler;

  try {
    compiler = webpack(webpackConfig);
  } catch (err) {
    console.log(chalk.red('Failed to compile.'));
    console.log();
    console.log(err.message || err);
    console.log();

    return process.exit(1);
  }

  compiler.hooks.invalid.tap('recompile-log', () => {
    if (isInteractive) {
      clearConsole();
    }
    console.log('Compiling...');
  });

  compiler.hooks.done.tap('finished-log', stats => {
    if (isInteractive) {
      clearConsole();
    }

    const messages = formatWebpackMessages(stats.toJson({}, true));
    const isSuccessful = !messages.errors.length && !messages.warnings.length;

    if (isSuccessful) {
      console.log(chalk.green('Compiled successfully!'));

      if (isInteractive) {
        const serverUrls = prepareUrls('http', '0.0.0.0', PORT);
        const devServerUrls = prepareUrls(
          https ? 'https' : 'http',
          '0.0.0.0',
          port,
        );

        console.log();
        console.log(
          `Your server is starting and should be accessible from your browser.`,
        );
        console.log();

        console.log(
          `  ${chalk.bold('Local:')}            ${
            serverUrls.localUrlForTerminal
          }`,
        );
        console.log(
          `  ${chalk.bold('On Your Network:')}  ${
            serverUrls.lanUrlForTerminal
          }`,
        );

        console.log();
        console.log(
          `Your bundles and other static assets are served from your ${chalk.bold(
            'dev-server',
          )}.`,
        );
        console.log();

        console.log(
          `  ${chalk.bold('Local:')}            ${
            devServerUrls.localUrlForTerminal
          }`,
        );
        console.log(
          `  ${chalk.bold('On Your Network:')}  ${
            devServerUrls.lanUrlForTerminal
          }`,
        );

        console.log();
        console.log('Note that the development build is not optimized.');
        console.log(
          `To create a production build, use ` +
            `${chalk.cyan('npm run build')}.`,
        );
        console.log();
      }
    }

    // If errors exist, only show errors.
    if (messages.errors.length) {
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }

      console.log(chalk.red('Failed to compile.\n'));
      console.log(messages.errors.join('\n\n'));

      return;
    }

    // Show warnings if no errors were found.
    if (messages.warnings.length) {
      console.log(chalk.yellow('Compiled with warnings.\n'));
      console.log(messages.warnings.join('\n\n'));
    }
  });

  return compiler;
}

function addEntry(
  entry: string | Array<string> | webpack.Entry | webpack.EntryFunc,
  hotEntries: Array<string>,
): string | Array<string> | webpack.Entry | webpack.EntryFunc {
  let newEntry: string | Array<string> | webpack.Entry | webpack.EntryFunc = {};

  if (typeof entry === 'function') {
    const originalEntry = entry;

    // @ts-ignore
    newEntry = async () => {
      return addEntry(await originalEntry(), hotEntries);
    };
  } else if (!Array.isArray(entry) && typeof entry === 'object') {
    const keys = Object.keys(entry);

    for (const entryName of keys) {
      newEntry[entryName] = hotEntries.concat(entry[entryName]);
    }
  } else {
    newEntry = hotEntries.concat(entry);
  }

  return newEntry;
}

function overrideRules(
  rules: Array<webpack.Rule>,
  patch: (rule: webpack.Rule) => webpack.Rule,
): Array<webpack.Rule> {
  return rules.map(ruleToPatch => {
    let rule = patch(ruleToPatch);
    if (rule.rules) {
      rule = { ...rule, rules: overrideRules(rule.rules, patch) };
    }
    if (rule.oneOf) {
      rule = { ...rule, oneOf: overrideRules(rule.oneOf, patch) };
    }
    if (rule.use) {
      // @ts-ignore
      rule = { ...rule, use: overrideRules(rule.use, patch) };
    }
    return rule;
  });
}

function waitForCompilation(compiler: webpack.Compiler) {
  return new Promise((resolve, reject) => {
    compiler.hooks.done.tap('promise', stats =>
      stats.hasErrors() ? reject(stats) : resolve(stats),
    );
  });
}

function createServerEntries(context: string, cwd: string = process.cwd()) {
  const serverFunctions = fs.pathExistsSync(path.join(cwd, SRC_DIR))
    ? globby.sync('**/*.api.(js|ts)', {
        cwd: path.join(cwd, SRC_DIR),
        absolute: true,
      })
    : [];

  const serverRoutes = fs.pathExistsSync(path.join(cwd, ROUTES_DIR))
    ? globby.sync('**/*.(js|ts)', {
        cwd: path.join(cwd, ROUTES_DIR),
        absolute: true,
      })
    : [];

  // Normalize to an object with short entry names
  const entries: Record<string, string> = [
    ...serverFunctions,
    ...serverRoutes,
  ].reduce((acc, filepath) => {
    return {
      ...acc,
      [path.relative(context, filepath).replace(/\.[^/.]+$/, '')]: filepath,
    };
  }, {});

  // Add custom entries for `yoshi-server`
  entries['routes/_api_'] = 'yoshi-server/build/routes/api';

  return entries;
}

function watchDynamicEntries(
  watching: webpack.Watching,
  cwd: string = process.cwd(),
) {
  const wp = new Watchpack({});

  wp.on('aggregated', () => {
    watching.invalidate();
  });

  wp.watch([], [path.join(cwd, SRC_DIR), path.join(cwd, ROUTES_DIR)]);
}

function validateServerEntry({
  cwd = process.cwd(),
  extensions,
  yoshiServer = false,
}: {
  cwd: string;
  extensions: Array<string>;
  yoshiServer: boolean;
}) {
  const serverEntry = possibleServerEntries.find(entry => {
    return (
      globby.sync(`${entry}(${extensions.join('|')})`, {
        cwd: path.join(cwd, SRC_DIR),
      }).length > 0
    );
  });

  if (!serverEntry && !yoshiServer) {
    throw new Error(
      `We couldn't find your server entry. Please use one of the defaults:
          - "src/server": for a fullstack project
          - "dev/server": for a client only project`,
    );
  }

  return serverEntry;
}

function calculatePublicPath({
  cwd = process.cwd(),
  url,
}: {
  cwd: string;
  url: string;
}) {
  // default public path
  let publicPath = '/';

  if (!inTeamCity() || isDevelopment) {
    // When on local machine or on dev environment,
    // set the local dev-server url as the public path
    publicPath = url;
  }

  // In case we are running in CI and there is a pom.xml file, change the public path according to the path on the cdn
  // The path is created using artifactName from pom.xml and artifact version from an environment param.
  if (shouldDeployToCDN(cwd)) {
    publicPath = getProjectCDNBasePath();
  }

  return publicPath;
}

export {
  createCompiler,
  waitForCompilation,
  addEntry,
  overrideRules,
  createServerEntries,
  watchDynamicEntries,
  validateServerEntry,
  calculatePublicPath,
};
