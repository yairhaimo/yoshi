type WebpackEntrypoints = {
  [bundle: string]: string | Array<string>;
};

export default async function getBaseWebpackConfig({
  isServer = false,
  isDev = false,
  entrypoints,
}: {
  isServer: boolean;
  isDev: boolean;
  entrypoints: WebpackEntrypoints;
}) {
  const config = {};

  return config;
}
