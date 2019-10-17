import React from 'react';
import PropTypes, { InferProps } from 'prop-types';
import { PublicDataContext, PublicDataType } from './PublicDataContext';

export class PublicData extends React.Component<
  InferProps<typeof PublicData.propTypes>
> {
  static propTypes = {
    children: PropTypes.func.isRequired,
  };

  render() {
    return (
      <PublicDataContext.Consumer>
        {publicData => {
          // If we are in editor mode (readyPromise)
          // but the data is not ready yet
          if (
            publicData.type === PublicDataType.EditorPublicData &&
            !publicData.ready
          ) {
            return <h1>loading</h1>;
          }

          return this.props.children(publicData);
        }}
      </PublicDataContext.Consumer>
    );
  }
}
