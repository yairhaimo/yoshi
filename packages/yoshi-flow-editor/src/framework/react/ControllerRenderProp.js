import React from 'react';
import { ControllerContext } from './ControllerContext';

export class Controller extends React.Component {
  render() {
    return (
      <ControllerContext.Consumer>
        {controller => this.props.children(controller)}
      </ControllerContext.Consumer>
    );
  }
}
