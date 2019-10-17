import React from 'react';

export const PublicDataContext = React.createContext({
  ready: false,
  readyPromise: null,
  set: null,
  get: null,
});
