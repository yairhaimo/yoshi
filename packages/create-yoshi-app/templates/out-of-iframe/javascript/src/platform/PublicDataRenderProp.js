import React from 'react';
import { PublicDataContext } from './PublicDataContext';

export class PublicData extends React.Component {
  render() {
    return (
      <PublicDataContext.Consumer>
        {publicData => this.props.children(publicData)}
      </PublicDataContext.Consumer>
    );
  }
}
