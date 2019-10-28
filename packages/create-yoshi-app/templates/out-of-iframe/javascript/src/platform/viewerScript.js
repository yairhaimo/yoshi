import { createController } from '../example/components/todo/controller';
import initApp from '../example/initApp';
import {
  createInstances,
  objectPromiseAll,
  fetchFrameworkData,
} from 'yoshi-flow-editor-runtime/utils';

let frameworkData;

export const createControllers = controllerConfigs => {
  const [controllerConfig] = controllerConfigs;
  const { appParams, platformAPIs, wixCodeApi, csrfToken } = controllerConfig;

  initializeExperiments();

  const appData = initApp({
    controllerConfigs,
    frameworkData,
    appParams,
    platformAPIs,
    wixCodeApi,
    csrfToken,
  });

  const { setProps } = controllerConfig;

  const setState = newState => {
    const updatedState = {
      ...context.state,
      ...newState,
    };

    // Track state
    context.state = updatedState;

    // Run state change callback
    wrappedControllerPromise.then(userController => {
      userController.stateChange();
    });

    // Update render cycle
    return setProps(updatedState);
  };

  const context = {
    state: {},
    setState,
  };

  const userControllerPromise = createController.call(context, {
    controllerConfig,
    frameworkData,
    appData,
  });

  const wrappedControllerPromise = userControllerPromise.then(
    userController => {
      return {
        ...userController,
        pageReady: async (...args) => {
          const awaitedFrameworkData = await objectPromiseAll(frameworkData);
          setProps({
            __publicData__: controllerConfig.config.publicData,
            ...awaitedFrameworkData,
            // Set initial state
            ...context.state,
            // Set methods
            ...userController.methods,
          });

          // Optional `pageReady`
          if (userController.pageReady) {
            return userController.pageReady(setProps, ...args);
          }
        },
      };
    },
  );

  return [wrappedControllerPromise];
};

const initializeExperiments = () => {
  frameworkData = fetchFrameworkData();

  // TODO: Generalize
  frameworkData.experimentsPromise = frameworkData.experimentsPromise.then(
    experiments => createInstances({ experiments }).experiments,
  );
};

export const initAppForPage = async () =>
  // initParams,
  // platformApis,
  // scopedSdkApis,
  // platformServicesApis,
  {
    initializeExperiments();
  };
