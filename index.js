'use strict';

const path = require('path');
const VersionChecker = require('ember-cli-version-checker');
const Funnel = require('broccoli-funnel');
const TransformAsyncToGenerator = 'transform-async-to-generator';

module.exports = {
  name: require('./package').name,

  init() {
    this._super.init.apply(this, arguments);
    const checker = new VersionChecker(this.project);
    this._regeneratorFromOtherAddons =
      checker.for('ember-maybe-import-regenerator-for-testing').exists() ||
      checker.for('ember-maybe-import-regenerator').exists();
    this._isBabel7 = checker.for('ember-cli-babel').gte('7.0.0');
    this._asyncPluginName = this._isBabel7
      ? `@babel/plugin-${TransformAsyncToGenerator}`
      : `babel-plugin-${TransformAsyncToGenerator}`;
  },

  included() {
    this._super.included.apply(this, arguments);
    const app = this._findApp();
    const babelAddon = this.project.addons.find(
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
        `[ember-async-to-generator] ${TransformAsyncToGenerator} is not needed, opting out of transpilation`
      );
      return;
    }

    // Now add the plugin with config to app's babel config
    app.options = app.options || {};
    app.options.babel = app.options.babel || {};
    const plugins = (app.options.babel.plugins =
      app.options.babel.plugins || []);
    const hasAsyncPlugin = plugins.find(p =>
      p[0].match(new RegExp(TransformAsyncToGenerator))
    );
    if (hasAsyncPlugin) {
      this.ui.writeWarnLine(
        `[ember-async-to-generator] you have already listed ${
          this._asyncPluginName
        } in babel plugins`
      );
    } else {
      const moduleMethodOption = {
        module: 'ember-async-to-generator/helper',
        method: 'asyncToGenerator'
      };
      if (this._isBabel7) {
        plugins.push([this._asyncPluginName, moduleMethodOption]);
      } else {
        const moduleMethodPluginName = 'transform-async-to-module-method';
        const hasModuleMethodPlugin = plugins.find(p =>
          p[0].match(new RegExp(moduleMethodPluginName))
        );
        if (!hasModuleMethodPlugin) {
          plugins.push([moduleMethodPluginName, moduleMethodOption]);
        } else {
          this.ui.writeWarnLine(
            `[ember-async-to-generator] you have already listed ${moduleMethodPluginName} in babel plugins`
          );
        }
      }
    }

    if (this._regeneratorFromOtherAddons) {
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

  treeForVendor() {
    if (this._regeneratorFromOtherAddons) {
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
