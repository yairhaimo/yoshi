module.exports = function(wallaby) {
  const wallabyCommon = require('./wallaby-common')(wallaby);
  // We need to add a wallaby compiler, because apparently wallaby does not
  // use the transform configuration of jest
  wallabyCommon.compilers = {
    '**/*.js{,x}': wallaby.compilers.babel({
      babel: require('@babel/core'),
      babelrc: true,
    }),
  };
  wallabyCommon.testFramework = 'jest';
  wallabyCommon.setup = () => {
    let jestConfig = require('yoshi/config/jest.config.js'); // eslint-disable-line import/no-unresolved
    if (jestConfig.preset === 'jest-yoshi-preset') {
      const jestYoshiPreset = require('jest-yoshi-preset/jest-preset'); // eslint-disable-line import/no-unresolved
      jestConfig = jestYoshiPreset.projects.find(
        project => project.displayName === 'spec',
      );
    }
    wallaby.testFramework.configure(jestConfig);
  };
  wallaby.workers = { restart: false };
  return wallabyCommon;
};
