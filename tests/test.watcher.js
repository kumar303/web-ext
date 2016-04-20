/* @flow */
import path from 'path';
import {it, describe} from 'mocha';
import fs from 'mz/fs';
import sinon from 'sinon';
import {assert} from 'chai';

import {default as onSourceChange, proxyFileChanges} from '../src/watcher';
import {withTempDir} from '../src/util/temp-dir';


describe('watcher', () => {

  it('watches for file changes', () => withTempDir(
    (tmpDir) => {
      const artifactsDir = path.join(tmpDir.path(), 'web-ext-artifacts');
      const someFile = path.join(tmpDir.path(), 'foo.txt');

      var resolveChange;
      const whenFilesChanged = new Promise((resolve) => {
        resolveChange = resolve;
      });
      const onChange = sinon.spy(() => {
        resolveChange();
      });

      return fs.writeFile(someFile, '<contents>')
        .then(() => {
          return onSourceChange({
            sourceDir: tmpDir.path(),
            artifactsDir,
            onChange,
          });
        })
        .then((watcher) => {
          return fs.utimes(someFile, Date.now(), Date.now())
            .then(() => watcher);
        })
        .then((watcher) => {
          return whenFilesChanged
            .then(() => {
              watcher.close();
              assert.equal(onChange.callCount, 1);
              // This delay seems to avoid stat errors from the watcher
              // which can happen when the temp dir is deleted (presumably
              // before watcher.close() has removed all listeners).
              return new Promise((resolve) => setTimeout(resolve, 2));
            });
        });
    }
  ));

  describe('proxyFileChanges', () => {

    it('proxies file changes', () => {
      const onChange = sinon.spy(() => {});
      proxyFileChanges({
        filePath: '/some/file.js',
        artifactsDir: '/some/artifacts/dir/',
        onChange,
      });
      assert.equal(onChange.called, true);
    });

    it('ignores changes to artifacts', () => {
      const onChange = sinon.spy(() => {});
      proxyFileChanges({
        filePath: '/some/artifacts/dir/build.xpi',
        artifactsDir: '/some/artifacts/dir/',
        onChange,
      });
      assert.equal(onChange.called, false);
    });

  });

});
