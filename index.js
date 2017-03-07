'use strict';

/** 
 * Simple wrapper to selected github api functions.
 * @param {*} event -
 * @param {*} context -
 * @param {*} callback -
*/
exports.handler = (event, context, callback) => {
  /**
   * Copy response to results and continue with next page.
   * @param {*} error - 
   * @param {*} response - 
   */
  function copyAndContinue(error, response) {
    if (error) {
      return false;
    }
    response.map((item) => { results.push(item); });
    if (github.hasNextPage(response)) {
      github.getNextPage(response, { 'user-agent': 'alexisargyris' }, copyAndContinue)
    } else { cb(null, results); }
  }
  /**
   * Checks if target exists in list.
   * @param {*} target -
   * @param {*} list -
   */
  function existsItemInList(target, list) {
    for (var index in list) {
      if (target === list[index].path) return index;
    }
    return -1;
  }

  let GitHubApi = require('github');
  let Promise = require('bluebird');
  let MarkdownIt = require('markdown-it');
  let creds = require('./creds.js').creds;
  let github;
  let results = [];
  let cb;
  let user;
  let token;
  let reponame;
  let commitsha;
  let commit;
  let getTreePrms;
  let getContentPrms;
  let textDecodeError = '<η αποκωδικοποίηση του κείμενου απέτυχε>';
  let srcRootPath = 'src/';
  let srcList = [];

  // If no command was provided, then exit immediately.
  if ((event === undefined) || (event.cmd === undefined) || (event.cmd === '')) {
    callback(new Error('Missing cmd parameter'))
  } else {
    // Init github api.
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
    // Main switch.
    switch (event.cmd) {
    case 'getRepos':
      // Get repos of authenticated user.
      Promise.promisify(github.repos.getAll)({ per_page: 100 })
        .then((response) => { callback(null, response) })
        .catch((error) => { callback(error) });
      break;
    case 'getCommits':
      // Get commits of repo.
      cb = callback;
      results.length = 0;
      // If no repo was provided, then exit immediately.
      if (event.reponame === undefined) {
        callback(new Error('Missing repo parameter'))
      } else {
        let reponame = event.reponame;
        Promise.promisify(github.repos.getCommits)({ owner: user, repo: reponame, per_page: 100 })
          .then((response) => { copyAndContinue(null, response); })
          .catch((error) => { callback(error); });
      }
      break;
    case 'getCommit':
      // Get contents of commit.
      // If no repo or sha were provided, then exit immediately.
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
    case 'getDoc':
      // Get from the latest commit's tree all files whose path starts with 'src' and form a single md doc.
      // If no repo name was provided, then exit immediately.
      if (event.reponame === undefined) {
        callback(new Error('Missing repo parameter'))
      } else {
        reponame = event.reponame;
        Promise.promisify(github.repos.getCommits)({ owner: user, repo: reponame, path: 'src/', page: 1, per_page: 1 })
          .then((commits) => {
            commitsha = commits[0].sha;
            getTreePrms = Promise.promisify(github.gitdata.getTree);
            getContentPrms = Promise.promisify(github.repos.getContent);
            return getTreePrms({ owner: user, repo: reponame, sha: commitsha, recursive: true });
          })
          .then((tree) => {
            let promises = [];

            srcList = tree.tree.filter((element, index, array) => { return element.path.startsWith(srcRootPath); })
            for (var src of srcList) { promises.push( getContentPrms({ owner: user, repo: reponame, path: src.path, ref: commitsha }) ) };
            return Promise.all(promises);
          })
          .then((contents) => {
            let docContent = '';

            for (var i = 0; i < contents.length; i++) {
              docContent += '\n\n# ' + srcList[i].path +'\n\n';
              docContent += new Buffer(contents[i].content, 'base64').toString('utf8');
            }
            callback(null, new MarkdownIt().render(docContent));
          })
          .catch((error) => { callback(error); });
      }
      break;
    default:
    }
  }
}

/*
  exports.handler({
    'cmd': 'getDoc',
    'reponame': 'amomonaima'
    // 'commitsha': '80b473dec837d3316d0b76960675a5761f9f359a'
  });
*/
