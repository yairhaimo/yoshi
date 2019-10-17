import React, { Suspense } from 'react';
import { getProcessedCss } from 'tpa-style-webpack-plugin/runtime';
import createInstances from './createInstances';
import ControllerProvider from './react/ControllerProvider';
import PublicDataProviderEditor from './react/PublicDataProviderEditor';
import PublicDataProviderViewer from './react/PublicDataProviderViewer';
import ErrorBoundary from './react/ErrorBoundary';

const PublicDataProvider =
  typeof Wix === 'undefined'
    ? PublicDataProviderViewer
    : PublicDataProviderEditor;

const WidgetWrapper = UserComponent =>
  class ComponentWrapper extends React.Component {
    constructor(props) {
      super(props);
      this.state = {};
    }

    render() {
      console.log(this.props.style);
      const css = getProcessedCss(this.props.style);
      console.log(css);

      return (
        <div>
          <link
            href="https://localhost:3200/viewerWidget.css"
            rel="stylesheet"
            type="text/css"
          />
          <style dangerouslySetInnerHTML={{ __html: css }} />
          <ErrorBoundary captureException={error => console.log(error)}>
            <PublicDataProvider
              data={this.props.__publicData__}
              Wix={window.Wix}
            >
              <Suspense fallback={<div>Loading...</div>}>
                <ControllerProvider data={this.props}>
                  <UserComponent
                    {...createInstances(this.props.experiments)}
                    // {...this.props}
                  />
                </ControllerProvider>
              </Suspense>
            </PublicDataProvider>
          </ErrorBoundary>
        </div>
      );
    }
  };

export default WidgetWrapper;
