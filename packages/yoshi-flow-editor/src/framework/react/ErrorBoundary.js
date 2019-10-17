import React from 'react';

export default class ErrorBoundary extends React.Component {
  componentDidCatch(error) {
    this.props.captureException(error);
  }

  render() {
    return this.props.children;
  }
}
