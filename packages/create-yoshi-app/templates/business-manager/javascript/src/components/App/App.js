import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import s from './App.scss';
import { notifyViewFinishedLoading } from '@wix/business-manager-api';
import { create } from '@wix/fedops-logger';
import { COMPONENT_NAME } from '../../config';

class App extends React.Component {
  static propTypes = {
    t: PropTypes.func,
  };

  componentDidMount() {
    // Note: you might want to invoke notify after initial data fetch (to keep BM loader during fetch)
    const fedopsLogger = create(COMPONENT_NAME);
    fedopsLogger.appLoaded();
    notifyViewFinishedLoading(COMPONENT_NAME);
  }

  render() {
    const { t } = this.props;
    return (
      <div className={s.root}>
        <div className={s.header}>
          <h2 data-testid="app-title">{t('app.title')}</h2>
        </div>
        <p className={s.intro}>{t('app.intro')}</p>
      </div>
    );
  }
}

export default translate(null, { wait: true })(App);
