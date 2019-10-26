import arg from 'arg';
import loadConfig from 'yoshi-config/loadConfig';
import { Config } from 'yoshi-config/build/config';

const defaultCommand = 'build';

export type cliCommand = (argv: Array<string>, config: Config) => Promise<void>;

const commands: {
  [command: string]: () => Promise<{ default: cliCommand }>;
} = {
  build: () => import('../scripts/build'),
  start: () => import('../scripts/start'),
};

const args = arg(
  {
    // Types
    '--version': Boolean,
    '--help': Boolean,
    '--inspect': Boolean,

    // Aliases
    '-v': '--version',
    '-h': '--help',
  },
  {
    permissive: true,
  },
);

// Check if we are running `next <subcommand>` or `next`
const foundCommand = Boolean(commands[args._[0]]);

// Makes sure the `next <subcommand> --help` case is covered
// This help message is only showed for `next --help`
if (!foundCommand && args['--help']) {
  console.log(`
    Usage
      $ next <command>
    Available commands
      ${Object.keys(commands).join(', ')}
    Options
      --version, -v   Version number
      --inspect       Enable the Node.js inspector
      --help, -h      Displays this message
    For more information run a command with the --help flag
      $ next build --help
  `);
  process.exit(0);
}

const command = foundCommand ? args._[0] : defaultCommand;
const forwardedArgs = foundCommand ? args._.slice(1) : args._;

// Make sure the `next <subcommand> --help` case is covered
if (args['--help']) {
  forwardedArgs.push('--help');
}

const defaultEnv = command === 'dev' ? 'development' : 'production';
process.env.NODE_ENV = process.env.NODE_ENV || defaultEnv;

const config = loadConfig();

commands[command]().then(exec => exec.default(forwardedArgs, config));
