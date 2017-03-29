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
    response.map(item => { results.push(item); });
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
  let textDecodeError = '<η αποκωδικοποίηση του κείμενου απέτυχε>';
  let srcRootPath = 'src/';
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
          .then(response => { callback(null, response) })
          .catch(error => { callback(error) });
        break;
      /**
       * Get commits of repo.
       * @param {string} reponame - the repo's name
       * @param {number} [page=undefined] - the number of the page being requested
       * @param {number} [per_page=100] - the number of commits a page should contain
       */
      case 'getCommits':
        // If required params are missing, then exit immediately.
        if (event.reponame === undefined) { callback(new Error(errorMissingParams)) }
        else {
          cb = callback;
          results.length = 0;
          Promise.promisify(github.repos.getCommits)({
            owner: user,
            repo: event.reponame,
            page: (event.page === undefined) ? defaultPage : event.page,
            per_page: (event.per_page === undefined) ? defaultPerPage : event.per_page
          })
            .then(response => { copyAndContinue(null, response) })
            .catch(error => { callback(error) });
        }
        break;
      /**
       * Get contents of commit.
       * @param {string} reponame - the repo's name
       * @param {string} commitsha - the commit's id
       */
      case 'getCommit':
        let commit = {};
        let docContent = '';
        let getContentPrms = Promise.promisify(github.repos.getContent);

        // If required params are missing, then exit immediately.
        if ((event.reponame === undefined) || (event.commitsha === undefined)) { callback(new Error(errorMissingParams)); }
        else {
          // get the commit
          Promise.promisify(github.repos.getCommit)({
            owner: user,
            repo: event.reponame,
            sha: event.commitsha
          })
            .then(response => {
              // get all files starting with 'src/' touched by the commit
              commit = response;
              return Promise.map(commit.files, (file, index, length) => {
                // check if this file starts with 'src'
                if (file.filename.startsWith(srcRootPath)) {
                  return getContentPrms({
                    owner: user,
                    repo: event.reponame,
                    path: file.filename,
                    ref: event.commitsha
                  })
                    .then(result => {
                      // store the file's content
                      file.content = new Buffer(result.content, 'base64').toString('utf8');
                    })
                }
                else { return Promise.resolve() }
              })
            })
            .then(() => {
              // get the commit's whole tree of files
              return Promise.promisify(github.gitdata.getTree)({
                owner: user,
                repo: event.reponame,
                sha: event.commitsha,
                recursive: true
              });
            })
            .then(tree => {
              // get all tree files starting with 'src/'
              // TODO some of these files must have already been downloaded in the previous step. Why do it twice?
              return Promise.map(tree.tree, (file, index, length) => {
                // check if this file starts with 'src'
                if (file.path.startsWith(srcRootPath)) {
                  return getContentPrms({
                    owner: user,
                    repo: event.reponame,
                    path: file.path,
                    ref: event.commitsha
                  })
                    .then(result => {
                      let cnt = new Buffer(result.content, 'base64').toString('utf8');
                      // concatenate all files to form a single doc
                      docContent += '\n\n# ' + file.path + '\n\n' + cnt + '\n\n';
                    })
                }
                else { return Promise.resolve() }
              })
            })
            .then(() => {
              // convert markdown content to html and store it
              commit.doc = new MarkdownIt().render(docContent);
              callback(null, commit)
            })
            .catch(error => { debugger; callback(error) });
        }
        break;
      default:
    }
  }
}

/*
  exports.handler({
    // 'cmd': 'getRepos'

    // 'cmd': 'getCommits',
    // 'reponame': 'amomonaima',
    // 'page': 1,
    // 'per_page': 1

    // 'cmd': 'getCommit',
    // 'reponame': 'amomonaima',
    // 'commitsha': 'c01511d565bd0b446353e3d5d99ea8848223ccfa'
  });
*/
