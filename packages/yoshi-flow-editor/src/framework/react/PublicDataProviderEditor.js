import React from 'react';
import { PublicDataContext } from './PublicDataContext';

// Later it can be passed into a hook as `usePublicData(scope)`
const scope = 'COMPONENT';

export default class PublicDataProviderEditor extends React.Component {
  state = {
    ready: false,
    data: null,
    readyPromise: Promise.reject(),
  };

  componentDidMount() {
    const { Wix } = this.props;

    const publicDataPromise = new Promise((resolve, reject) =>
      Wix.Data.Public.getAll(resolve, reject),
    );

    publicDataPromise.then(
      data => {
        this.setState({
          data: data[scope] || {},
          ready: true,
        });
      },
      error => {
        throw new Error(error);
      },
    );

    // Specifically for editor, can be in a different provider that's
    // only used in `WidgetWrapper`
    Wix.addEventListener(Wix.Events.PUBLIC_DATA_CHANGED, newPublicData => {
      this.setState({
        data: newPublicData || {},
      });
    });

    this.setState({
      readyPromise: publicDataPromise,
    });
  }

  handleGetParam = key => {
    if (!this.state.ready) {
      throw new Error('Public data provider is not ready');
    }

    return this.state.data[key];
  };

  handleSetParam = (key, value) => {
    const { Wix } = this.props;

    if (!this.state.ready) {
      throw new Error('Public data provider is not ready');
    }

    if (this.state.data[key] === value) {
      return;
    }

    this.setState(state => ({
      data: {
        ...state.data,
        [key]: value,
      },
    }));

    Wix.Data.Public.set(
      key,
      value,
      { scope },
      () => {},
      error => {
        throw new Error(error);
      },
    );
  };

  render() {
    return (
      <PublicDataContext.Provider
        value={{
          ready: this.state.ready,
          readyPromise: this.state.readyPromise,
          get: this.handleGetParam,
          set: this.handleSetParam,
        }}
      >
        {this.props.children}
      </PublicDataContext.Provider>
    );
  }
}
