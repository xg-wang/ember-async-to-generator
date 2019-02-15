# ember-async-to-generator

## Installation

```
ember install ember-async-to-generator
```

## What does the addon do?

**tl;dr**: Enable async-await syntax without including the whole babel polyfill.

Under the hood, this addon configures babel's [async-to-generator](https://babeljs.io/docs/en/babel-plugin-transform-async-to-generator) plugin to use `RSVP.Promise`.
The babel plugin defaults to use native `Promise` which breaks in old browsers.

The transpiled `async/await` code needs [regenerator-runtime](http://facebook.github.io/regenerator/).
This addon will check [target browsers](https://guides.emberjs.com/release/configuring-ember/build-targets/), [babel options](https://github.com/babel/ember-cli-babel#options) to properly import the asset (~2.5kb after gzip).

## What about ember-maybe-import-regenerator(-for-testing)?

[ember-maybe-import-regenerator](https://github.com/machty/ember-maybe-import-regenerator) and [ember-maybe-import-regenerator-for-testing](https://github.com/ember-cli/ember-maybe-import-regenerator-for-testing) only imports the regenerator assets, but your app will still be using native Promise.

`ember-async-to-generator` will check existence of those two addons to avoid duplicate import.
If you wish to only import the asset in test, you can install `ember-maybe-import-regenerator-for-testing` and `eslint-plugin-disable-features`, see this [blog post](https://www.rwjblue.com/2017/10/30/async-await-configuration-adventure/#supports-non-native-async-browsers).

## License

This project is licensed under the [MIT License](LICENSE.md).
