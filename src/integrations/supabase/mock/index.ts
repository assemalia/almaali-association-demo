/**
 * يجمّع العميل الوهمي: from() للاستعلامات، auth للمصادقة،
 * و channel/removeChannel كعمليات صورية (لا realtime في الوضع الوهمي).
 */
import { MockQuery } from './queryBuilder';
import { mockAuth } from './auth';

function makeChannel() {
  const channel = {
    on() { return channel; },
    subscribe(cb?: (status: string) => void) {
      if (cb) Promise.resolve().then(() => cb('SUBSCRIBED'));
      return channel;
    },
    unsubscribe() { return Promise.resolve('ok'); },
    send() { return Promise.resolve('ok'); },
  };
  return channel;
}

export function createMockClient() {
  return {
    from(table: string) { return new MockQuery(table); },
    auth: mockAuth,
    channel() { return makeChannel(); },
    removeChannel() { return Promise.resolve('ok'); },
    removeAllChannels() { return Promise.resolve('ok'); },
    getChannels() { return []; },
  };
}

export { resetDemoData } from './store';
