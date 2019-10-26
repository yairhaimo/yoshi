import stream from 'stream';
import child_process from 'child_process';
import chalk from 'chalk';
import waitPort from 'wait-port';
import fs from 'fs-extra';
import { getDevelopmentEnvVars } from 'yoshi-helpers/bootstrap-utils';
import SocketServer from './socket-server';
import { PORT } from './constants';

function serverLogPrefixer() {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(`${chalk.greenBright('[SERVER]')}: ${chunk.toString()}`);
      callback();
    },
  });
}

function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

const inspectArg = process.argv.find(arg => arg.includes('--debug'));

export default class ServerProcess {
  private serverFilePath: string;
  private hmrPort: number;
  private socketServer: SocketServer;
  private child?: child_process.ChildProcess;
  private resolve?: (value?: unknown) => void;

  constructor({
    serverFilePath,
    hmrPort,
  }: {
    serverFilePath: string;
    hmrPort: number;
  }) {
    this.hmrPort = hmrPort;
    this.socketServer = new SocketServer({ hmrPort });
    this.serverFilePath = serverFilePath;
  }

  async initialize() {
    await this.socketServer.initialize();

    const bootstrapEnvironmentParams = getDevelopmentEnvVars({
      app: this.app,
      port: PORT,
    });

    this.child = child_process.fork(this.serverFilePath, [], {
      stdio: 'pipe',
      execArgv: [inspectArg]
        .filter(notUndefined)
        .map(arg => arg.replace('debug', 'inspect')),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT,
        HMR_PORT: `${this.hmrPort}`,
        ...bootstrapEnvironmentParams,
      },
    });

    const serverLogWriteStream = fs.createWriteStream(this.app.SERVER_LOG_FILE);
    const serverOutLogStream = this.child.stdout!.pipe(serverLogPrefixer());
    serverOutLogStream.pipe(serverLogWriteStream);
    serverOutLogStream.pipe(process.stdout);

    const serverErrorLogStream = this.child.stderr!.pipe(serverLogPrefixer());
    serverErrorLogStream.pipe(serverLogWriteStream);
    serverErrorLogStream.pipe(process.stderr);

    this.socketServer.on('message', this.onMessage.bind(this));

    await waitPort({
      port: PORT,
      output: 'silent',
      timeout: 20000,
    });
  }

  onMessage(response: any) {
    this.resolve && this.resolve(response);
  }

  end() {
    this.child && this.child.kill();
  }

  send(message: any) {
    this.socketServer.send(message);

    return new Promise(resolve => {
      this.resolve = resolve;
    });
  }

  async restart() {
    // @ts-ignore
    if (this.child && this.child.exitCode === null) {
      this.child.kill();

      await new Promise(resolve =>
        setInterval(() => {
          if (this.child && this.child.killed) {
            resolve();
          }
        }, 100),
      );
    }

    await this.initialize();
  }
}
