import arg from 'arg';
import { cliCommand } from '../bin/yoshi-app';
// import {} from 'yoshi-common';

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

  const { getAppData } = await buildApps([rootApp], args);

  const [, clientOptimizedStats, serverStats] = getAppData(rootApp).stats;

  printBuildResult({ webpackStats: [clientOptimizedStats, serverStats] });
  printBundleSizeSuggestion();
};

export default build;
