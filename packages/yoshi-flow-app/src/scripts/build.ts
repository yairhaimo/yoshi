import path from 'path';
import arg from 'arg';
import fs from 'fs-extra';
import {
  BUILD_DIR,
  TARGET_DIR,
  PUBLIC_DIR,
  ASSETS_DIR,
} from 'yoshi-config/paths';
import getBaseWebpackConfig from 'yoshi-common/build/webpack.config';
import { cliCommand } from '../bin/yoshi-app';

// const buildApps = require('yoshi/src/commands/utils/build-apps');
// const {
//   printBundleSizeSuggestion,
//   printBuildResult,
// } = require('yoshi/src/commands/utils/print-build-results');

const build: cliCommand = async function(argv, config) {
  const args = arg(
    {
      // Types
      '--help': Boolean,
      // Aliases
      '-h': '--help',
    },
    { argv },
  );

  const join = (...dirs: Array<string>) => path.join(process.cwd(), ...dirs);

  await Promise.all([
    fs.emptyDir(join(BUILD_DIR)),
    fs.emptyDir(join(TARGET_DIR)),
  ]);

  if (await fs.pathExists(join(PUBLIC_DIR))) {
    await fs.copy(join(PUBLIC_DIR), join(ASSETS_DIR));
  }

  const clientDebugConfig = getBaseWebpackConfig({
    name: config.name as string,
    target: 'web',
    publicPath: '',
    isDev: true,
    // withLocalSourceMaps: options['source-map'],
  });

  const clientOptimizedConfig = getBaseWebpackConfig({
    name: config.name as string,
    target: 'web',
    publicPath: '',
    // isAnalyze: options.analyze,
    // withLocalSourceMaps: options['source-map'],
  });

  const serverConfig = getBaseWebpackConfig({
    name: config.name as string,
    target: 'node',
    isDev: true,
    publicPath: '',
  });
};

export default build;
