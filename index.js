'use strict';

exports.handler = (event, context, callback) => {
  function copyAndContinue(error, response) {
    if (error) {
      return false;
    }
    response.map((item) => { results.push(item); });
    if (github.hasNextPage(response)) {
      github.getNextPage(response, { 'user-agent': 'alexisargyris' }, copyAndContinue)
    } else { cb(null, results); }
  }

  let GitHubApi = require('github');
  let Promise = require('bluebird');
  let creds = require('./creds.js').creds;
  let github;
  let results = [];
  let cb;

  // if no command was specified, then exit
  if ((event === undefined) || (event.cmd === undefined) || (event.cmd === '')) {
    callback(new Error('Missing cmd parameter'))
  } else {
    // init github api
    let user = creds.user;
    let token = creds.token;
    github = new GitHubApi({
      // required
      version: '3.0.0',
      // optional
      debug: true,
      protocol: 'https',
      host: 'api.github.com',
      pathPrefix: '',
      timeout: 5000,
      headers: {
        'user-agent': user
      }
    });
    github.authenticate({
      type: 'oauth',
      token: token
    });
    // main switch
    switch (event.cmd) {
    case 'getAll':
      // get all repos of the authenticated user
      Promise.promisify(github.repos.getAll)({ per_page: 100 })
        .then((response) => { callback(null, response) })
        .catch((error) => { callback(error) });
      break;
    case 'getCommits':
      // get the commits of a repo
      // if no repo was provided, then exit
      cb = callback;
      results.length = 0;
      if (event.reponame === undefined) {
        callback(new Error('Missing repo parameters'))
      } else {
        let reponame = event.reponame;
        Promise.promisify(github.repos.getCommits)({ owner: user, repo: reponame, per_page: 100 })
          .then((response) => { copyAndContinue(null, response); })
          .catch((error) => { callback(error); });
      }
      break;
    case 'getCommit':
      // get the content of a commit
      // if no repo/sha were provided, then exit
      if ((event.reponame === undefined) || (event.commitsha === undefined)) {
        callback(new Error('Missing repo/sha parameters'))
      } else {
        let reponame = event.reponame;
        let commitsha = event.commitsha;
        Promise.promisify(github.repos.getCommit)({ owner: user, repo: reponame, sha: commitsha })
          .then((response) => { callback(null, response) })
          .catch((error) => { callback(error) });
      }
      break;
    case 'getContent':
      // get the content of a file
      // if no repo/path/ref were provided, then exit
      if ((event.reponame === undefined) || (event.path === undefined) || (event.ref === undefined)) {
        callback(new Error('Missing repo/path/ref parameters'))
      } else {
        let reponame = event.reponame;
        let path = event.path;
        let ref = event.ref;
        Promise.promisify(github.repos.getContent)({ owner: user, repo: reponame, path: path, ref: ref })
          .then((response) => { callback(null, response) })
          .catch((error) => { callback(error) });
      }
      break;
    case 'getTree':
      // get the content of a tree
      // if no repo/sha were provided, then exit
      if ((event.reponame === undefined) || (event.sha === undefined)) {
        callback(new Error('Missing repo/sha parameters'))
      } else {
        let reponame = event.reponame;
        let sha = event.sha;
        Promise.promisify(github.gitdata.getTree)({ owner: user, repo: reponame, sha: sha, recursive: true })
          .then((response) => { callback(null, response) })
          .catch((error) => { callback(error) });
      }
      break;
    default:
    }
  }
}

exports.handler({
  // 'cmd': 'getCommits',
  'cmd': 'getCommit',
  'reponame': 'amomonaima',
  'commitsha': '03e171ddb2f1d475b627915d497335ecc9a77c37'
});
