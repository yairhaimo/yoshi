import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import filesize from 'filesize';
import { sync as gzipSize } from 'gzip-size';
import rootApp from 'yoshi-config/root-app';

export function printBundleSizeSuggestion() {
  console.log(chalk.dim('    Interested in reducing your bundle size?'));
  console.log();
  console.log(
    chalk.dim('      > Try https://webpack.js.org/guides/code-splitting'),
  );
  console.log(
    chalk.dim(
      `      > If it's still large, analyze your bundle by running \`npx yoshi build --analyze\``,
    ),
  );
}

export function printBuildResult({ app = rootApp, webpackStats }) {
  const [clientStats, serverStats] = webpackStats;

  const clientAssets = prepareAssets(clientStats, app.STATICS_DIR, app);
  const serverAssets = prepareAssets(serverStats, app.BUILD_DIR, app);

  printStatsResult(clientAssets, 'cyan');
  printStatsResult(serverAssets, 'yellow');
}

function prepareAssets(optimizedStats, assetsDir, app = rootApp) {
  return optimizedStats
    .toJson({ all: false, assets: true })
    .assets.filter(asset => !asset.name.endsWith('.map'))
    .map(asset => {
      const fileContents = fs.readFileSync(path.join(assetsDir, asset.name));

      return {
        folder: path.join(
          path.relative(app.ROOT_DIR, assetsDir),
          path.dirname(asset.name),
        ),
        name: path.basename(asset.name),
        gzipSize: gzipSize(fileContents),
        size: asset.size,
      };
    })
    .sort((a, b) => b.gzipSize - a.gzipSize);
}

function printStatsResult(assets, assetNameColor) {
  return assets.forEach(asset => {
    console.log(
      '  ' +
        filesize(asset.size) +
        '  ' +
        `(${filesize(asset.gzipSize)} GZIP)` +
        '  ' +
        `${chalk.dim(asset.folder + path.sep)}${chalk[assetNameColor](
          asset.name,
        )}`,
    );
  });
}
