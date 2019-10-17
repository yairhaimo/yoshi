import React from 'react';
import { ControllerContext } from './ControllerContext';

export default class ControllerProvider extends React.Component {
  render() {
    return (
      <ControllerContext.Provider value={this.props.data}>
        {this.props.children}
      </ControllerContext.Provider>
    );
  }
}
