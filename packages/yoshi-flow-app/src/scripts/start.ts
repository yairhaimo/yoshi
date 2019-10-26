import arg from 'arg';
import rootApp from 'yoshi-config/root-app';
import { cliCommand } from '../bin/yoshi-app';

const startSingleApp = require('yoshi/src/commands/utils/start-single-app');

const start: cliCommand = async function(argv, config) {
  const args = arg(
    {
      // Types
      '--server': String,
      '--help': Boolean,
      // Aliases
      '-h': '--help',
      '--entry-point': '--server',
    },
    { argv },
  );

  await startSingleApp(rootApp, args);
};

export default start;
