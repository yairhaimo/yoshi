import React from 'react';
import { PublicDataContext } from './PublicDataContext';

export class PublicData extends React.Component {
  render() {
    return (
      <PublicDataContext.Consumer>
        {publicData => {
          if (!publicData.ready && publicData.readyPromise) {
            throw publicData.readyPromise;
          }

          return this.props.children(publicData);
        }}
      </PublicDataContext.Consumer>
    );
  }
}
