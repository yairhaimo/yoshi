import React from 'react';
import ReactDOM from 'react-dom';
import { ViewerScriptWrapper } from '@wix/native-components-infra';
import { createControllers, initAppForPage } from '../viewerApp/viewerScript';
import WidgetWrapper from '../platform/WidgetWrapper';

const EditorApp = ViewerScriptWrapper(WidgetWrapper, {
  viewerScript: { createControllers, initAppForPage },
  Wix: window.Wix,
  widgetConfig: {},
});

ReactDOM.render(<EditorApp />, document.getElementById('root'));
