var creds = require('./creds.js').creds;
var GitHubApi = require('github');

exports.handler = (event, context, callback) => {
  var user = creds.user;
  var token = creds.token;
  var github = new GitHubApi({
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

  // if no command was specified, then exit
  if ((event === undefined) || (event.cmd === undefined) || (event.cmd === '')) {
    callback(new Error('Missing cmd parameter'))
  }
  github.authenticate({
    type: 'oauth',
    token: token
  });
  switch (event.cmd) {
  case 'getAll':
    // get all repos of the authenticated user
    github.repos.getAll({
      per_page: 100
    }, (error, response) => {
      context.callbackWaitsForEmptyEventLoop = false;
      if (error) { callback(error) } 
      else { callback(null, response) }
    });
    break;
  case 'getCommits':
    // get the commits of a repo
    var reponame;
    // if no repo was provided, then exit
    if ((event.reponame === undefined)) {
      callback(new Error('Missing repo/sha parameters'))
    } else {
      reponame = event.reponame;
    }
    github.repos.getCommits({
      user: user,
      repo: reponame
    }, (error, response) => {
      context.callbackWaitsForEmptyEventLoop = false;
      if (error) { callback(error) } 
      else { callback(null, response) }
    });
    break;
  case 'getCommit':
    // get the content of a commit
    var reponame;
    var commitsha;
    // if no repo/sha were provided, then exit
    if ((event.reponame === undefined) || (event.commitsha === undefined)) {
      callback(new Error('Missing repo/sha parameters'))
    } else {
      reponame = event.reponame;
      commitsha = event.commitsha;
    }
    github.repos.getCommit({
      user: user,
      repo: reponame,
      sha: commitsha
    }, (error, response) => {
      context.callbackWaitsForEmptyEventLoop = false;
      if (error) { callback(error) } 
      else { callback(null, response) }
    });
    break;
  case 'getContent':
    // get the content of a file
    var reponame;
    var path;
    var ref;
    // if no repo/path/ref were provided, then exit
    if ((event.reponame === undefined) || (event.path === undefined) || (event.ref === undefined)) {
      callback(new Error('Missing repo/path/ref parameters'))
    } else {
      reponame = event.reponame;
      path = event.path;
      ref = event.ref;
    }
    github.repos.getContent({
      user: user,
      repo: reponame,
      path: path,
      ref: ref
    }, (error, response) => {
      context.callbackWaitsForEmptyEventLoop = false;
      if (error) { callback(error) } 
      else { callback(null, response) }
    });
    break;
  case 'getTree':
    // get the content of a tree
    var reponame;
    var sha;
    // if no repo/sha were provided, then exit
    if ((event.reponame === undefined) || (event.sha === undefined)) {
      callback(new Error('Missing repo/sha parameters'))
    } else {
      reponame = event.reponame;
      sha = event.sha;
    }
    github.gitdata.getTree({
      user: user,
      repo: reponame,
      sha: sha,
      recursive: true
    }, (error, response) => {
      context.callbackWaitsForEmptyEventLoop = false;
      if (error) { callback(error) } 
      else { callback(null, response) }
    })
    break;
  default:
  }
}
