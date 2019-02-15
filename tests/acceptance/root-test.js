import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | root', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /', async function(assert) {
    assert.expect(1);
    await visit('/');
    assert.equal(
      this.element.querySelector('#model').textContent,
      'hello async'
    );
  });
});
