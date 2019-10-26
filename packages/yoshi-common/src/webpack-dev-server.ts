import path from 'path';
import cors from 'cors';
import WebpackDevServer from 'webpack-dev-server';
import webpack from 'webpack';
import { STATICS_DIR } from 'yoshi-config/paths';
import { redirectMiddleware } from '../src/tasks/cdn/server-api';

export default class extends WebpackDevServer {
  constructor(
    compiler: webpack.Compiler,
    {
      publicPath,
      https,
      host,
      port,
      cwd = process.cwd(),
    }: {
      publicPath: string;
      https: boolean;
      host: string;
      port: number;
      cwd: string;
    },
  ) {
    super(compiler, {
      // Enable gzip compression for everything served
      compress: true,
      clientLogLevel: 'error',
      contentBase: path.join(cwd, STATICS_DIR),
      watchContentBase: true,
      hot: true,
      publicPath,
      // We write our own errors/warnings to the console
      quiet: true,
      https,
      // The server should be accessible externally
      host,
      overlay: true,
      // https://github.com/wix/yoshi/pull/1191
      allowedHosts: [
        '.wix.com',
        '.wixsite.com',
        '.ooidev.com',
        '.deviantart.lan',
      ],
      before(expressApp) {
        // Send cross origin headers
        expressApp.use(cors());
        // Redirect `.min.(js|css)` to `.(js|css)`
        expressApp.use(redirectMiddleware(host, port));
      },
    });
  }

  // Update sockets with new stats, we use the sockWrite() method
  // to update the hot client with server data
  send(type: string, data: any) {
    // @ts-ignore
    return this.sockWrite(this.sockets, type, data);
  }
}
