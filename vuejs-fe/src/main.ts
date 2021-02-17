import type { ModuleProps } from '@fielmann-ag/wip-module-logic';
import { getComponent } from './main_umd';

const props: ModuleProps = {
  env: 'local',
  baseURL: '/',
  locale: 'deDE',
  user: { auth: null, userInfo: { accountId: '123', email: 'test@wip.de', sub: '' } },
  publishToTopic: (topic, data) => {
    console.log(topic, data);
    return true;
  },
  subscribeToTopic: (topic, callback) => {
    (callback as any)(topic, '');
    return topic;
  },
  unsubscribeFromToken: () => true,
};
document.getElementsByTagName('body')[0].appendChild(getComponent(props));
