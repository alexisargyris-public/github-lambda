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
  function existsItemInList(target, list) {
    for (var index in list) {
      if (target === list[index].path) return index;
    }
    return -1;
  }

  let GitHubApi = require('github');
  let Promise = require('bluebird');
  let creds = require('./creds.js').creds;
  let github;
  let results = [];
  let cb;
  let user;
  let token;
  let reponame;
  let commitsha;
  let commit;
  let promises;
  let getTreePrms;
  let getContentPrms;
  let textDecodeError = '<η αποκωδικοποίηση του κείμενου απέτυχε>';

  // if no command was specified, then exit
  if ((event === undefined) || (event.cmd === undefined) || (event.cmd === '')) {
    callback(new Error('Missing cmd parameter'))
  } else {
    // init github api
    user = creds.user;
    token = creds.token;
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
      // get a commit
      // if no repo/sha were provided, then exit
      if ((event.reponame === undefined) || (event.commitsha === undefined)) {
        callback(new Error('Missing repo/sha parameters'))
      } else {
        reponame = event.reponame;
        commitsha = event.commitsha;
        getTreePrms = Promise.promisify(github.gitdata.getTree);
        getContentPrms = Promise.promisify(github.repos.getContent);
        Promise.promisify(github.repos.getCommit)({ owner: user, repo: reponame, sha: commitsha })
          .then((response) => {
            commit = response;
            return getTreePrms({ owner: user, repo: reponame, sha: commit.sha, recursive: true });
          })
          .then((tree) => {
            let promises = [];
            for (var file of commit.files) {
              var check = existsItemInList(file.filename, tree.tree);
              if ( check > 0) promises.push(
                getContentPrms({ owner: user, repo: reponame, path: tree.tree[check].path, ref: commit.sha })
              );
            }
            return Promise.all(promises);
          })
          .then((contents) => {
            let i = 0;
            for (var file of commit.files) {
              try { file.content =  new Buffer(contents[i].content, 'base64').toString('utf8'); }
              catch (e) { file.content = textDecodeError; }
              i++;
            }
          })
          .then(() => callback(null, commit))
          .catch(error => callback(error));
      }
      break;
    default:
    }
  }
}

/*
  exports.handler({
    // 'cmd': 'getCommits',
    'cmd': 'getCommit',
    'reponame': 'amomonaima',
    'commitsha': '80b473dec837d3316d0b76960675a5761f9f359a'
  });
*/
