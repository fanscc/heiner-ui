'use strict';

const fs = require('fs');
const Path = require('path');
const os = require('os');
import DocSet from './docset';
import Resource from './resource';
import { cd, exec } from 'shelljs';
import { window, workspace, ExtensionContext } from 'vscode';

interface RepoObject {
  name: string;
  type: string;
  links: object;
}

class Library {
  static REFRESH_PERIOD_MS_ = 2 * 60 * 60 * 1000;
  static DEFAULT_DOCSETS = new Set([
    'heiner'
  ]);

  catalog: any;
  repos: any;
  cmd: string;
  context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.catalog = null;
    this.context = context;
    this.fetchRepo();
    this.cmd = '';
    setInterval(() => { this.fetchAllVersion(this.repos); }, Library.REFRESH_PERIOD_MS_);
  }

  // id: type
  get(id) {
    return this.catalog[id];
  }

  queryAll() {
    let ret = [];
    for (const id in this.catalog) {
      ret = ret.concat(this.catalog[id].queryAll());
    }
    return ret;
  }

  fetchRepo() {
    return Resource.get(Path.join(Resource.RESOURCE_PATH, Resource.RESOURCE_REPO))
      .then((result: string) => {
        this.repos = JSON.parse(result)
        this.buildCatalog(this.repos);
        this.fetchAllVersion(this.repos);
      }).catch(error => {
        console.log('fetchRepo error: ', error);
      });
  }

  fetchAllVersion(repos: RepoObject[]) {
    cd(`${Resource.RESOURCE_PATH}/..`);
    exec('npm update heiner-new --save', { async: true });
  }

  setVersionSchema(versions: string[]) {
    const config = workspace.getConfiguration('heiner-helper');
    const filename = Path.join(__dirname, '..', '..', 'package.json');
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        console.error('ReadFail');
        return;
      };
      const content = JSON.parse(data);
      content.contributes.configuration.properties['heiner-helper.version']['enum'] = versions;
      config.update('version', versions[versions.length - 1], true);
      fs.writeFileSync(filename, JSON.stringify(content, null, 2));
    });
  }

  isSame(local: JSON, online: JSON) {
    for (let key in online) {
      if (!local[key]) {
        return false;
      }
    }
    return true;
  }

  setLoading(value: boolean) {
    this.context.workspaceState.update('heiner-helper.loading', value);
  }

  getValues(obj) {
    let values = [];
    for (let key in obj) {
      values.push(obj[key]);
    }
    return values;
  }

  buildCatalog(repos) {
    const catalog = {};

    for (let i = 0; i < repos.length; ++i) {
      const repo = repos[i];
      catalog[repo.type] = new DocSet(repo);
    }

    this.catalog = catalog;
  }
}

export default Library;
