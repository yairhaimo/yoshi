import 'isomorphic-fetch';
import { createControllers } from './viewerScript';
import { EXPERIMENTS_SCOPE } from '../config/constants';
import { mockExperiments } from '../components/Widget/appController.spec';

describe('createControllers', () => {
  let widgetConfig;
  beforeEach(() => {
    widgetConfig = {
      appParams: {
        baseUrls: {
          staticsBaseUrl: 'http://localhost:3200/',
        },
      },
      wixCodeApi: {
        window: {
          locale: 'en',
        },
        user: {
          currentUser: {
            id: 'userId',
          },
        },
      },
    };
  });

  it('should return controllers with pageReady method given widgets config', async () => {
    mockExperiments(EXPERIMENTS_SCOPE, { someExperiment: 'true' });

    const result = createControllers([widgetConfig]);
    expect(result).toHaveLength(1);
    expect((await result[0]).pageReady.call).toBeDefined();
  });
});
