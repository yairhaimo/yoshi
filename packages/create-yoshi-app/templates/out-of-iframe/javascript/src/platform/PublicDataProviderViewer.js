import React from 'react';
import { PublicDataContext } from './PublicDataContext';

// Later it can be passed into a hook as `usePublicData(scope)`
const scope = 'COMPONENT';

export default class PublicDataProviderViewer extends React.Component {
  handleGetParam = key => {
    return this.props.data[scope][key];
  };

  render() {
    return (
      <PublicDataContext.Provider
        value={{
          get: this.handleGetParam,
        }}
      >
        {this.props.children}
      </PublicDataContext.Provider>
    );
  }
}
