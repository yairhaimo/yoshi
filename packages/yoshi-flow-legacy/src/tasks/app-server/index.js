const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const spawn = require('cross-spawn');
const detect = require('detect-port');
const debounce = require('lodash/debounce');
const waitPort = require('wait-port');
const boxen = require('boxen');
const { getDevelopmentEnvVars } = require('yoshi-helpers/bootstrap-utils');
const { PORT } = require('../../constants');
const rootApp = require('yoshi-config/root-app');

let server;
let port;

const defaultPort = Number(process.env.PORT) || PORT;
const serverDebugHost = '127.0.0.1';

function ensureServerIsNotRunning(newPort) {
  let startServerPromise = Promise.resolve(newPort);
  if (server) {
    server.kill('SIGTERM');
    startServerPromise = new Promise(resolve => {
      // Wait for the server to really be killed (Otherwise, sometimes, debugging port is not released)
      const intervalKey = setInterval(() => {
        if (server.killed) {
          clearInterval(intervalKey);
          resolve(newPort);
        }
      }, 500);
    });
  }

  return startServerPromise;
}

function initializeServerStartDelegate({
  serverScript,
  debugPort,
  debugBrkPort,
  log,
}) {
  return async newPort => {
    const defaultEnv = {
      NODE_ENV: 'development',
      DEBUG: 'wix:*,wnp:*',
    };

    const bootstrapEnvironmentParams = getDevelopmentEnvVars({
      port: newPort,
    });

    const env = Object.assign(defaultEnv, process.env, {
      PORT: newPort,
      ...bootstrapEnvironmentParams,
    });

    if (newPort !== defaultPort) {
      console.log(
        chalk.green(
          `There's something running on port ${defaultPort}, using ${newPort} instead.`,
        ),
      );
    }

    mkdirp.sync(path.resolve('target'));
    const runScripts = [serverScript];
    if (debugBrkPort !== undefined) {
      runScripts.unshift(`--inspect-brk=${serverDebugHost}:${debugBrkPort}`);
    } else if (debugPort !== undefined) {
      runScripts.unshift(`--inspect=${serverDebugHost}:${debugPort}`);
    }

    server = spawn('node', runScripts, { env });
    [server.stdout, server.stderr].forEach(stream => stream.on('data', log));

    const displayErrors = debounce(() => {
      console.log(
        chalk.red('There are errors! Please check'),
        chalk.magenta('./target/server.log'),
      );
    }, 500);

    server.stderr.on('data', buffer => {
      if (buffer.toString().includes('wix:error')) {
        displayErrors();
      }
    });

    const waitingLogTimeout = setTimeout(() => {
      console.log('');
      console.log(
        `Still waiting for app-server to start (make sure it is listening on port ${chalk.magenta(
          newPort,
        )}...)`,
      );
    }, 3000);

    await waitPort({
      host: 'localhost',
      port: env.PORT,
      output: 'silent',
    });

    clearTimeout(waitingLogTimeout);

    const localUrlForBrowser = `http://localhost:${env.PORT}${env.MOUNT_POINT ||
      '/'}`;

    console.log(
      'Application is now available at ',
      chalk.magenta(localUrlForBrowser),
    );
    if (debugBrkPort !== undefined) {
      console.log(
        'Debugger is available at ',
        chalk.magenta(`${serverDebugHost}:${debugBrkPort}`),
      );
    } else if (debugPort !== undefined) {
      console.log(
        'Debugger is available at ',
        chalk.magenta(`${serverDebugHost}:${debugPort}`),
      );
    }
    console.log(
      'Server log is written to ',
      chalk.magenta('./target/server.log'),
    );

    return localUrlForBrowser;
  };
}

const showNoServerWarning = entryPoint => {
  console.log(
    boxen(
      `Yoshi could not find a server file at:\n\n` +
        chalk.gray(`  ${entryPoint}\n\n`) +
        chalk.grey('*') +
        ` Using a server?     ${chalk.cyan(
          'yoshi start --entry-point <SERVER ENTRY>',
        )}\n\n` +
        chalk.grey('*') +
        ` Not using a server? ${chalk.cyan('yoshi start --no-server')}`,
      {
        padding: 1,
        borderColor: 'yellow',
        borderStyle: 'round',
        align: 'left',
      },
    ),
  );
};

module.exports = ({
  base = process.cwd(),
  entryPoint = 'index.js',
  manualRestart = false,
  debugPort = undefined,
  debugBrkPort = undefined,
} = {}) => {
  function writeToServerLog(data) {
    fs.appendFile(rootApp.SERVER_LOG_FILE, data, () => {});
  }

  if (server && manualRestart) {
    server.kill('SIGHUP');
    return Promise.resolve();
  }

  const serverScript = path.resolve(base, entryPoint);

  if (!fs.existsSync(serverScript)) {
    showNoServerWarning(entryPoint);
    return Promise.resolve();
  }

  port = port || detect(defaultPort);

  const startServer = initializeServerStartDelegate({
    serverScript,
    debugPort,
    debugBrkPort,
    log: writeToServerLog,
  });

  return port.then(ensureServerIsNotRunning).then(startServer);
};
