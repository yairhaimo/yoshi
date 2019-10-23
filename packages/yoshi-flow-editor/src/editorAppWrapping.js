const path = require('path');
const fs = require('fs-extra');

const widgetWrapperPath = 'yoshi-flow-editor-runtime/build/WidgetWrapper.js';

const componentWrapper = (generatedWidgetEntriesPath, userComponents) => {
  return userComponents.reduce((acc, widgetAbsolutePath) => {
    const widgetName = path.basename(path.dirname(widgetAbsolutePath));
    const viewerScriptDirectory = path.join(
      widgetAbsolutePath,
      '../../../../platform',
    );
    const generatedWidgetEntryPath = path.join(
      generatedWidgetEntriesPath,
      `${widgetName}EditorApp.js`,
    );

    const generateWidgetEntryContent = `
    import React from 'react';
    import ReactDOM from 'react-dom';
    import { ViewerScriptWrapper } from '@wix/native-components-infra';
    import { createControllers, initAppForPage } from '${viewerScriptDirectory}/viewerScript.js';
    import WidgetWrapper from '${widgetWrapperPath}';
    import Component from '${widgetAbsolutePath}';

    const EditorApp = ViewerScriptWrapper(WidgetWrapper(Component), {
      viewerScript: { createControllers, initAppForPage },
      Wix: window.Wix,
      widgetConfig: {},
    });

    ReactDOM.render(<EditorApp />, document.getElementById('root'));`;

    fs.outputFileSync(generatedWidgetEntryPath, generateWidgetEntryContent);

    if (widgetName === 'todo') {
      acc['editorApp'] = generatedWidgetEntryPath;
    }

    return acc;
  }, {});
};

module.exports = componentWrapper;
