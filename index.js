'use strict';

const path = require('path');
const VersionChecker = require('ember-cli-version-checker');
const Funnel = require('broccoli-funnel');
const TransformAsyncToGenerator = 'transform-async-to-generator';
const PluginTransformAsyncToGenerator = `@babel/plugin-${TransformAsyncToGenerator}`;

module.exports = {
  name: require('./package').name,

  init() {
    this._super.init.apply(this, arguments);
    this.checker = new VersionChecker(this);
  },

  included() {
    this._super.included.apply(this, arguments);
    const app = this._findApp();
    const babelAddon = this.addons.find(
      addon => addon.name === 'ember-cli-babel'
    );
    if (!babelAddon) {
      this.ui.writeWarnLine(
        '[ember-async-to-generator] Could not find `ember-cli-babel` addon, opting out of transpilation'
      );
      return;
    }
    if (!babelAddon.isPluginRequired(TransformAsyncToGenerator)) {
      this.ui.writeInfoLine(
        `[ember-async-to-generator] ${PluginTransformAsyncToGenerator} is not needed, opting out of transpilation`
      );
      return;
    }

    // Now add the plugin with config to app's babel config
    app.options = app.options || {};
    app.options.babel = app.options.babel || {};
    const plugins = (app.options.babel.plugins =
      app.options.babel.plugins || []);
    const hasPlugin = plugins.find(
      p => p[0] === PluginTransformAsyncToGenerator
    );
    if (!hasPlugin) {
      plugins.push([
        PluginTransformAsyncToGenerator,
        {
          module: 'ember-async-to-generator',
          method: 'asyncToGenerator'
        }
      ]);
    } else {
      this.ui.writeWarnLine(
        `[ember-async-to-generator] you have already listed ${PluginTransformAsyncToGenerator} in babel plugins`
      );
    }

    // Should we import regenerator runtime asset
    if (this._hasOtherAddons()) {
      return;
    }
    const babelOptions = app.options.babel;
    const emberCLIBabelOptions = app.options['ember-cli-babel'] || {};
    const alreadyIncluded =
      app.__ember_async_to_generator_included ||
      babelOptions.includePolyfill ||
      emberCLIBabelOptions.includePolyfill;
    app.__ember_async_to_generator_included = true;
    if (
      !alreadyIncluded &&
      babelAddon.isPluginRequired('transform-regenerator')
    ) {
      app.import('vendor/regenerator-runtime/runtime.js', {
        prepend: true
      });
    }
  },

  treeForVendor: function() {
    if (this._hasOtherAddons()) {
      return;
    }
    const regeneratorRuntimePath = path.dirname(
      require.resolve('regenerator-runtime')
    );
    return new Funnel(regeneratorRuntimePath, {
      srcDir: '/',
      destDir: 'regenerator-runtime',
      files: ['runtime.js']
    });
  },

  _hasOtherAddons() {
    return (
      this.checker.for('ember-maybe-import-regenerator-for-testing').exists() ||
      this.checker.for('ember-maybe-import-regenerator').exists()
    );
  },

  _findApp() {
    if (typeof this._findHost === 'function') {
      return this._findHost();
    } else {
      let app;
      let current = this;
      do {
        app = current.app || this;
      } while (
        current.parent &&
        current.parent.parent &&
        (current = current.parent)
      );
      return app;
    }
  }
};
