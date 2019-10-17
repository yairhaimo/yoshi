import React, { Suspense } from 'react';
import {
  PublicDataProviderEditor,
  ErrorBoundary,
} from 'yoshi-flow-editor-runtime';

import Settings from '../example/components/todo/Settings';

export default class ComponentWrapper extends React.Component {
  render() {
    return (
      <ErrorBoundary handleException={error => console.log(error)}>
        <PublicDataProviderEditor Wix={window.Wix}>
          <Suspense fallback={<div>Loading...</div>}>
            <Settings />
          </Suspense>
        </PublicDataProviderEditor>
      </ErrorBoundary>
    );
  }
}
