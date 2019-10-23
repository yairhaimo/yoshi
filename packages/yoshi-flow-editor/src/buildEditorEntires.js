const path = require('path');
const globby = require('globby');
const componentWrapping = require('./componentWrapping');
const editorAppWrapping = require('./editorAppWrapping');
const settingsWrapping = require('./settingsWrapping');

const generatedWidgetEntriesPath = path.resolve(__dirname, '../tmp/components');

const buildEditorPlatformEntries = () => {
  const userComponents = globby.sync('./src/example/**/Component.js', {
    absolute: true,
  });

  const userSettings = globby.sync('./src/example/**/Settings.js', {
    absolute: true,
  });

  const componentEntries = componentWrapping(
    generatedWidgetEntriesPath,
    userComponents,
  );
  const editorAppEntries = editorAppWrapping(
    generatedWidgetEntriesPath,
    userComponents,
  );
  const settingsEntries = settingsWrapping(
    generatedWidgetEntriesPath,
    userSettings,
  );

  return { ...componentEntries, ...editorAppEntries, ...settingsEntries };
};

module.exports = buildEditorPlatformEntries;
