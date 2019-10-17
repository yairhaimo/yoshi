import React, { Suspense } from 'react';
import PublicDataProviderEditor from './PublicDataProviderEditor';
import ErrorBoundary from './ErrorBoundary';
import Settings from '../example/widgets/todo/Settings';

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
