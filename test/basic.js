/* eslint-env node, mocha */

const debug = require("debug")("test:basic");
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

async function buildFixture(fixture) {
  let tmpPath = path.join(tmp.dirSync().name, fixture);
  debug(tmpPath);
  let originFixure = `test/fixture/${fixture}`;
  debug("cp -r %s %s", originFixure, tmpPath);
  fs.copySync(originFixure, tmpPath);

  await execa("yarn", ["link"], { stdio: "inherit" });

  mutatePkg(tmpPath, (pkgJson) => {
    pkgJson.devDependencies["ember-async-to-generator"] = "*";
    return pkgJson;
  })
  await execa("yarn", ["link", "ember-async-to-generator"], {
    stdio: "inherit",
    cwd: tmpPath
  });
  await execa("yarn", ["install", "--no-lockfile", "--ignore-engines"], { cwd: tmpPath, stdio: "inherit" });

  await execa("yarn", ["build"], {
    stdio: "inherit",
    cwd: tmpPath
  });
  return tmpPath;
}

async function tearDownFixture(tmpPath) {
  await execa("yarn", ["unlink"], { stdio: "inherit" });
  debug("rm -r %s", tmpPath);
  fs.removeSync(tmpPath);
}

describe("Basic", function() {
  this.timeout(200 * 1000);

  let currentTmp;

  afterEach(async function() {
    await tearDownFixture(currentTmp);
  });

  it("transforms async to use our helper when used in app", async function() {
    currentTmp = await buildFixture("dummy-app");
    let appJs = path.join(currentTmp, "dist", "assets", "dummy-app.js");
    expect(appJs)
      .to.be.a.file()
      .with.contents.that.match(/helper\.asyncToGenerator/);
  });

  it("transforms async to use our helper when used in addon development dummy app", async function() {
    currentTmp = await buildFixture("dummy-addon");
    let appJs = path.join(currentTmp, "dist", "assets", "dummy.js");
    expect(appJs)
      .to.be.a.file()
      .with.contents.that.match(/helper\.asyncToGenerator/);
  });
});
