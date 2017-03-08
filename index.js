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
  let textDecodeError = '<η αποκωδικοποίηση του κείμενου απέτυχε>';
  let srcRootPath = 'src/';
  let srcList = [];
  let defaultPage; // default value is 'undefined'
  let defaultPerPage = 100;
  let errorMissingParams = 'Required parameter is missing';

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
      /**
       * Get repos of authenticated user.
       */
      case 'getRepos':
        Promise.promisify(github.repos.getAll)({ per_page: 100 })
          .then((response) => { callback(null, response) })
          .catch((error) => { callback(error) });
        break;
      /**
       * Get commits of repo.
       * @param {string} reponame - the repo's name
       * @param {number} [page=undefined] - the number of the page being requested
       * @param {number} [per_page=100] - the number of commits a page should contain
       */
      case 'getCommits':
        cb = callback;
        results.length = 0;
        // If required params are missing, then exit immediately.
        if (event.reponame === undefined) {
          callback(new Error(errorMissingParams))
        } else {
          reponame = event.reponame;
          Promise.promisify(github.repos.getCommits)({
            owner: user,
            repo: reponame,
            page: (event.page === undefined) ? defaultPage : event.page,
            per_page: (event.per_page === undefined) ? defaultPerPage : event.per_page
          })
            .then((response) => { debugger; copyAndContinue(null, response); })
            .catch((error) => { debugger; callback(error); });
        }
        break;
      /**
       * Get contents of commit.
       * @param {string} reponame - the repo's name
       * @param {string} commitsha - the commit's id
       */
      case 'getCommit':
        // If required params are missing, then exit immediately.
        if ((event.reponame === undefined) || (event.commitsha === undefined)) { callback(new Error(errorMissingParams)); }
        else {
          // get the commit
          reponame = event.reponame;
          commitsha = event.commitsha;
          Promise.promisify(github.repos.getCommit)({
            owner: user,
            repo: reponame,
            sha: commitsha
          })
            .then((response) => {
              // get the commit's tree
              commit = response;
              return Promise.promisify(github.gitdata.getTree)({
                owner: user,
                repo: reponame,
                sha: commit.sha,
                recursive: true
              });
            })
            .then((tree) => {
              // get the content of each file touched by the commit and all 'src' files at the time of the commit
              let filePromises = [];
              let docPromises = [];
              let getContentPrms = Promise.promisify(github.repos.getContent);
              // files contents
              for (var file of commit.files) {
                var check = existsItemInList(file.filename, tree.tree);
                if (check > 0) filePromises.push(getContentPrms({
                  owner: user,
                  repo: reponame,
                  path: tree.tree[check].path,
                  ref: commit.sha
                }));
              }
              // 'src' files
              srcList = tree.tree.filter((element, index, array) => { return element.path.startsWith(srcRootPath); });
              for (var src of srcList) {
                docPromises.push(getContentPrms({
                  owner: user,
                  repo: reponame,
                  path: src.path,
                  ref: commitsha
                }))
              };
              return Promise.all([Promise.all(filePromises), Promise.all(docPromises)]);
            })
            .then((contents) => {
              let i = 0;
              let docContent = '';

              // add the files to the commit
              for (var file of commit.files) {
                try { file.content = new Buffer(contents[0][i].content, 'base64').toString('utf8'); }
                catch (e) { file.content = textDecodeError; }
                i++;
              }
              // add 'doc' property to the commit
              for (var j = 0; j < contents[1].length; j++) {
                docContent += '\n\n# ' + srcList[j].path + '\n\n';
                docContent += new Buffer(contents[1][j].content, 'base64').toString('utf8');
              }
              commit.doc = new MarkdownIt().render(docContent);
            })
            .then(() => { callback(null, commit) })
            .catch(error => { callback(error) });
        }
        break;
      default:
    }
  }
}

/*
  exports.handler({
    'cmd': 'getCommit',
    'reponame': 'amomonaima',
    // 'page': 1,
    // 'per_page': 1
    'commitsha': 'a6d2cef54473795854c7d3e9a5c10266662de4c6'
  });
*/
