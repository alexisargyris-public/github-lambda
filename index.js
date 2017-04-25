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
    response.map(item => {
      results.push({
        title: item.commit.message, // TODO: fix this
        message: item.commit.message, // TODO: fix this
        sha: item.sha
      });
    });
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
  if ( (event === undefined) || (event.cmd === undefined) || (event.cmd === '') ) {
    callback(new Error('Missing cmd parameter'))
  } else if ( (event.cmd !== 'sources') && (event.cmd !== 'list') && (event.cmd !== 'single') ) {
    callback(new Error('Unknown command'))
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
       * Get sources (repos) of authenticated user.
       */
      case 'sources':
        Promise.promisify(github.repos.getAll)({ per_page: 100 })
          .then(response => {
            let result = [];
            response.forEach(element => { result.push({name: element.name}) });
            callback(null, result);
          })
          .catch(error => { callback(error) });
        break;

      /**
       * Get cards (commits) of source (repo).
       * @param {string} reponame - the repo's name
       * @param {number} [page=undefined] - the number of the page being requested
       * @param {number} [per_page=100] - the number of commits a page should contain
       */
      case 'list':
        // if required params are missing, then exit immediately.
        if (event.reponame === undefined) { callback(new Error(errorMissingParams)); }
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
       * @return {Object} a commit object as returned from github with the following additional information:
       *  1. In each commit.files with a path starting with srcRootPath, a 'content' property is added holding the file's content in its original Markdown format. 
       *  2. At the top level, a 'doc' property is added holding a concatenation of ???? in HTML format (converted from the original Markdown).
       */
      case 'single':
        let commit = {};
        let docContent = '';
        let getContentPrms = Promise.promisify(github.repos.getContent);

        // if required params are missing, then exit immediately.
        if ((event.reponame === undefined) || (event.commitsha === undefined)) { callback(new Error(errorMissingParams)); }
        else {
          // get the commit
          Promise.promisify(github.repos.getCommit)({
            owner: user,
            repo: event.reponame,
            sha: event.commitsha
          })
            // store the commit for later; get the content of all files touched by the commit
            .then(response => {
              // store the response as the result
              commit.created = response.commit.committer.date;
              // 'files' may contain 0 or more results
              commit.files = [];
              // get the content of all files touched by the commit, if their path starts with srcRootPath (note: order of execution doesn't matter). 
              return Promise.map(response.files, (file, index, length) => {
                // check if this file starts with 'src'
                if (file.filename.startsWith(srcRootPath)) {
                  commit.files.push({
                    path: file.filename,
                    changes: file.changes,
                    deletions: file.deletions,
                    additions: file.additions
                  })
                  return getContentPrms({
                    owner: user,
                    repo: event.reponame,
                    path: file.filename,
                    ref: event.commitsha
                  })
                    .then(result => {
                      // store the new content in the file record that was pushed above
                      commit.files[commit.files - 1].content = new Buffer(result.content, 'base64').toString('utf8');
                    })
                }
                else { return Promise.resolve() }
              })
            })
            // now, to build the 'doc' property, start by getting the commit's whole tree of files
            .then(() => {
              return Promise.promisify(github.gitdata.getTree)({
                owner: user,
                repo: event.reponame,
                sha: event.commitsha,
                recursive: true
              });
            })
            // get contents of all source tree items to form current doc
            .then(tree => {
              // for each item in the tree (note: order of execution matters)
              return Promise.mapSeries(tree.tree, (file, index, length) => {
                // check if the item starts with srcRootPath and is a 'blob' (file), i.e. not a dir
                if ( (file.path.startsWith(srcRootPath)) && (file.type === 'blob') ) {
                  // get its contents
                  return getContentPrms({
                    owner: user,
                    repo: event.reponame,
                    path: file.path,
                    ref: event.commitsha
                  })
                    // concatenate the content of each file with the previous ones to form a single doc
                    .then(result => {
                      let cnt = new Buffer(result.content, 'base64').toString('utf8');
                      docContent += '\n\n# ' + file.path + '\n\n' + cnt + '\n\n';
                    })
                }
                else { return Promise.resolve() }
              })
            })
            // convert markdown doc content to html
            .then(() => {
              commit.doc = new MarkdownIt().render(docContent);
              callback(null, commit)
            })
            .catch(error => { callback(error) });
        }
        break;
      default:
    }
  }
}

/*
  exports.handler({
    // 'cmd': 'sources'

    // 'cmd': 'list',
    // 'reponame': 'amomonaima',
    // 'page': 1,
    // 'per_page': 1

    // 'cmd': 'single',
    // 'reponame': 'amomonaima',
    // 'commitsha': '72ffb6a9ac328c34245a9fee0292c8dd03a62c11'
  });
*/
