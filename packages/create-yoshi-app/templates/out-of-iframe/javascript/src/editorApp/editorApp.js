import React from 'react';
import ReactDOM from 'react-dom';
import { ViewerScriptWrapper } from '@wix/native-components-infra';
import { createControllers, initAppForPage } from '../viewerApp/viewerScript';
import WidgetWrapper from 'yoshi-flow-editor/src/framework/WidgetWrapper';
import Component from '../example/components/todo/Component';

const EditorApp = ViewerScriptWrapper(WidgetWrapper(Component), {
  viewerScript: { createControllers, initAppForPage },
  Wix: window.Wix,
  widgetConfig: {},
});

ReactDOM.render(<EditorApp />, document.getElementById('root'));
