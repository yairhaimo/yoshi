import React from 'react';
import { InferProps, shape, func, string } from 'prop-types';
import { PublicDataContext, PublicDataType } from './PublicDataContext';

// Later it can be passed into a hook as `usePublicData(scope)`
const scope = 'COMPONENT';

interface IState {
  ready: boolean;
  data: Record<string, any> | null;
  readyPromise: Promise<boolean> | null;
}

export class PublicDataProviderEditor extends React.Component<
  InferProps<typeof PublicDataProviderEditor.propTypes>
> {
  static propTypes = {
    Wix: shape({
      addEventListener: func.isRequired,
      Events: shape({
        PUBLIC_DATA_CHANGED: string.isRequired,
      }).isRequired,
      Data: shape({
        Public: shape({
          set: func.isRequired,
          getAll: func.isRequired,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  };

  state: IState = {
    ready: false,
    data: null,
    readyPromise: Promise.reject(),
  };

  componentDidMount() {
    const { Wix } = this.props;

    const publicDataPromise: Promise<Record<string, any>> = new Promise(
      (resolve, reject) => {
        try {
          return Wix.Data.Public.getAll(resolve, reject);
        } catch (e) {
          console.error(e);
          reject(e);
        }
      },
    );

    publicDataPromise.then(data => {
      this.setState({
        data: data[scope] || {},
        ready: true,
      });
    });

    // Specifically for editor, can be in a different provider that's
    // only used in `WidgetWrapper`
    Wix.addEventListener(
      Wix.Events.PUBLIC_DATA_CHANGED,
      (newPublicData: Record<string, any>) => {
        this.setState({
          data: newPublicData || {},
        });
      },
    );

    this.setState({
      readyPromise: publicDataPromise,
    });
  }

  handleGetParam = (key: string) => {
    if (!this.state.ready || !this.state.data) {
      throw new Error('Public data provider is not ready');
    }

    return this.state.data[key];
  };

  handleSetParam = (key: string, value: any) => {
    const { Wix } = this.props;

    if (!this.state.ready || !this.state.data) {
      throw new Error('Public data provider is not ready');
    }

    if (this.state.data[key] === value) {
      return;
    }

    this.setState((state: IState) => ({
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
      (error: string | undefined) => {
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
          type: PublicDataType.EditorPublicData,
        }}
      >
        {this.props.children}
      </PublicDataContext.Provider>
    );
  }
}
