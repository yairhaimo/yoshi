import React from 'react';
import { PublicDataContext } from './PublicDataContext';

// Later it can be passed into a hook as `usePublicData(scope)`
const scope = 'COMPONENT';

export default class PublicDataProviderViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: { get: this.handleGetParam },
    };
  }

  handleGetParam = key => {
    console.log('handle get param');
    return this.props.data[scope][key];
  };

  render() {
    return (
      <PublicDataContext.Provider value={this.state.value}>
        {this.props.children}
      </PublicDataContext.Provider>
    );
  }
}
