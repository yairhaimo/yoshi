import React, { Suspense } from 'react';
import Widget from '../example/widgets/todo/Widget';
import createInstances from './createInstances';
import { getProcessedCss } from 'tpa-style-webpack-plugin/runtime';
import ControllerProvider from './ControllerProvider';
import PublicDataProviderEditor from './PublicDataProviderEditor';
import PublicDataProviderViewer from './PublicDataProviderViewer';
import ErrorBoundary from './ErrorBoundary';

const PublicDataProvider =
  typeof Wix === 'undefined'
    ? PublicDataProviderViewer
    : PublicDataProviderEditor;

export default class ComponentWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const css = getProcessedCss(this.props.style);

    return (
      <div>
        <link
          href="https://localhost:3200/viewerWidget.css"
          rel="stylesheet"
          type="text/css"
        />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <ErrorBoundary captureException={error => console.log(error)}>
          <PublicDataProvider data={this.props.__publicData__} Wix={window.Wix}>
            <Suspense fallback={<div>Loading...</div>}>
              <ControllerProvider data={this.props}>
                <Widget
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
}
