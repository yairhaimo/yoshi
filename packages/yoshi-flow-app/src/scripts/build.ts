import arg from 'arg';
import rootApp from 'yoshi-config/root-app';
import { cliCommand } from '../bin/yoshi-app';

const buildApps = require('yoshi/src/commands/utils/build-apps');
const {
  printBundleSizeSuggestion,
  printBuildResult,
} = require('yoshi/src/commands/utils/print-build-results');

const build: cliCommand = async function(argv) {
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
