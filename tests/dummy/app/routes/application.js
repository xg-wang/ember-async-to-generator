import Route from '@ember/routing/route';
import { Promise as RSVPPromise } from 'rsvp';
import fetch from 'fetch';

export default Route.extend({
  async model() {
    const result = await fetch('/data.json');
    const json = await result.json();
    return await RSVPPromise.resolve(json.data);
  }
});
