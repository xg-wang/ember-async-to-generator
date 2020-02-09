"use strict";

const path = require("path");
const VersionChecker = require("ember-cli-version-checker");
const Funnel = require("broccoli-funnel");
const { hasPlugin, addPlugin } = require("ember-cli-babel-plugin-helpers");
const PluginName = "@babel/plugin-transform-async-to-generator";

module.exports = {
  name: require("./package").name,

  init() {
    this._super.init.apply(this, arguments);
    const checker = new VersionChecker(this.project);
    this._regeneratorFromOtherAddons =
      checker.for("ember-maybe-import-regenerator-for-testing").exists() ||
      checker.for("ember-maybe-import-regenerator").exists();
  },

  included(parent) {
    this._super.included.apply(this, arguments);
    const babelAddon = this.parent.addons.find(
      addon => addon.name === "ember-cli-babel"
    );
    if (!babelAddon) {
      this.ui.writeWarnLine(
        "[ember-async-to-generator] Could not find `ember-cli-babel` addon, opting out of transpilation"
      );
      return;
    }
    if (!babelAddon.isPluginRequired("transform-async-to-generator")) {
      this.ui.writeInfoLine(
        `[ember-async-to-generator] ${PluginName} is not needed, opting out of transpilation`
      );
      return;
    }

    // Now add the plugin with config to parent's babel config
    if (hasPlugin(parent, PluginName)) {
      this.ui.writeWarnLine(
        `[ember-async-to-generator] ${parent.name} have already listed ${PluginName} in babel plugins`
      );
    } else {
      const moduleMethodOption = {
        module: "ember-async-to-generator/helper",
        method: "asyncToGenerator"
      };
      addPlugin(parent, [require.resolve(PluginName), moduleMethodOption]);
    }

    if (this._regeneratorFromOtherAddons) {
      return;
    }
    const app = this._findApp();
    const babelOptions = app.options.babel;
    const emberCLIBabelOptions = app.options["ember-cli-babel"] || {};
    const alreadyIncluded =
      app.__ember_async_to_generator_included ||
      babelOptions.includePolyfill ||
      emberCLIBabelOptions.includePolyfill;
    app.__ember_async_to_generator_included = true;
    if (
      !alreadyIncluded &&
      babelAddon.isPluginRequired("transform-regenerator")
    ) {
      app.import("vendor/regenerator-runtime/runtime.js", {
        prepend: true
      });
    }
  },

  treeForVendor() {
    if (this._regeneratorFromOtherAddons) {
      return;
    }
    const regeneratorRuntimePath = path.dirname(
      require.resolve("regenerator-runtime")
    );
    return new Funnel(regeneratorRuntimePath, {
      srcDir: "/",
      destDir: "regenerator-runtime",
      files: ["runtime.js"]
    });
  },

  _findApp() {
    if (typeof this._findHost === "function") {
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
