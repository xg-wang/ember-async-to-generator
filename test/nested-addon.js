/* eslint-env node, mocha */

const debug = require("debug")("test:nested-addon");
const expect = require("chai").use(require("chai-fs")).expect;
const path = require("path");
const execa = require("execa");
const fs = require("fs-extra");
const tmp = require("tmp");

function mutatePkg(pathToRepo, fn) {
  let pkgPath = path.join(pathToRepo, 'package.json')
  let pkgJson = fs.readJsonSync(pkgPath)
  let mutatedPkgJson = fn(pkgJson)
  fs.writeJsonSync(pkgPath, mutatedPkgJson);
}

async function buildAppWithNestedAddon() {
  let appFixture = "dummy-app";
  let addonFixture = "dummy-addon";
  let tmpPath = tmp.dirSync().name;

  let appTmp = path.join(tmpPath, appFixture);
  let addonTmp = path.join(tmpPath, addonFixture);
  debug("cp -r %s %s", `test/fixture/${appFixture}`, appTmp);
  fs.copySync(`test/fixture/${appFixture}`, appTmp);
  debug("cp -r %s %s", `test/fixture/${addonFixture}`, addonTmp);
  fs.copySync(`test/fixture/${addonFixture}`, addonTmp);

  await execa("yarn", ["link"], { stdio: "inherit" });

  mutatePkg(addonTmp, (pkgJson) => {
    pkgJson.dependencies = pkgJson.dependencies || [];
    pkgJson.dependencies["ember-async-to-generator"] = "*";
    return pkgJson;
  })
  await execa("yarn", ["link", "ember-async-to-generator"], {
    stdio: "inherit",
    cwd: addonTmp
  });
  await execa("yarn", ["link"], { stdio: "inherit", cwd: addonTmp })
  await execa("yarn", ["install", "--no-lockfile"], { cwd: addonTmp, stdio: "inherit" });

  mutatePkg(appTmp, (pkgJson) => {
    pkgJson.devDependencies["dummy-addon"] = "../dummy-addon";
    return pkgJson;
  })
  // await execa("yarn", ["link", "dummy-addon"], {
  //   stdio: "inherit",
  //   cwd: appTmp
  // });
  await execa("yarn", ["install", "--no-lockfile"], { cwd: appTmp, stdio: "inherit" });

  await execa("yarn", ["build"], {
    stdio: "inherit",
    cwd: appTmp
  });
  return {appTmp, addonTmp};
}

async function tearDownFixture({appTmp, addonTmp}) {
  await execa("yarn", ["unlink"], { stdio: "inherit" });

  debug("rm -r %s", appTmp);
  fs.removeSync(appTmp);

  await execa("yarn", ["unlink"], { stdio: "inherit", cwd: addonTmp });
  debug("rm -r %s", addonTmp);
  fs.removeSync(addonTmp);
}

describe("Nested Addon", function() {
  this.timeout(200 * 1000);

  let appTmp;
  let addonTmp;

  afterEach(async function() {
    await tearDownFixture({appTmp, addonTmp});
  });

  it("transforms async to use our helper in app's vendor", async function() {
    tmpPaths = await buildAppWithNestedAddon();
    appTmp = tmpPaths.appTmp;
    addonTmp = tmpPaths.addonTmp;
    let appJs = path.join(appTmp, "dist", "assets", "dummy-app.js");
    expect(appJs)
      .to.be.a.file()
      .with.contents.that.match(/helper\.asyncToGenerator/);
  });
});

