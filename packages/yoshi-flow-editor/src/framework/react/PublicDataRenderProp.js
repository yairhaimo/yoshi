import React from 'react';
import { PublicDataContext } from './PublicDataContext';

export class PublicData extends React.Component {
  render() {
    return (
      <PublicDataContext.Consumer>
        {publicData => {
          // If we are in editor mode (readyPromise)
          // but the data is not ready yet
          if (publicData.readyPromise && !publicData.ready) {
            return <h1>loading</h1>;
          }

          return this.props.children(publicData);
        }}
      </PublicDataContext.Consumer>
    );
  }
}
