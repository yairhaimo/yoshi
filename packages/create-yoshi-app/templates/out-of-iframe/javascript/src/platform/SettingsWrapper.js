import React, { Suspense } from 'react';
import PublicDataProviderEditor from 'yoshi-flow-editor/src/framework/react/PublicDataProviderEditor';
import ErrorBoundary from 'yoshi-flow-editor/src/framework/react/ErrorBoundary';
import Settings from '../example/components/todo/Settings';

export default class ComponentWrapper extends React.Component {
  render() {
    return (
      <ErrorBoundary captureException={error => console.log(error)}>
        <PublicDataProviderEditor Wix={window.Wix}>
          <Suspense fallback={<div>Loading...</div>}>
            <Settings />
          </Suspense>
        </PublicDataProviderEditor>
      </ErrorBoundary>
    );
  }
}
