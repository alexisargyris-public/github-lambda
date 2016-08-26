var creds = require('./creds.js').creds;
var GitHubApi = require('github');

function respond(error, response) {
  if (error) {
    if (callback !== undefined) callback(error)
  } else {
    if (callback !== undefined) callback(null, response)
  }
}

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

  // if no command is specified, then exit
  if ((event === undefined) || (event.cmd === undefined) || (event.cmd === '')) {
    if (callback !== undefined) callback(new Error('Missing cmd parameter'))
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
    }, respond.bind(this));
    break;
  case 'getCommit':
    // get the content of a commit
    var reponame;
    var commitsha;
    // if no repo/sha were provided, then exit
    if ((event.reponame === undefined) || (event.commitsha === undefined)) {
      if (callback !== undefined) callback(new Error('Missing repo/sha parameters'))
    } else {
      reponame = event.reponame;
      commitsha = event.commitsha;
    }
    github.repos.getCommit({
      // get content of commit
      user: user,
      repo: reponame,
      sha: commitsha
    }, respond.bind(this));
    break;
  case 'getContent':
    // get the content of a file
    var reponame;
    var path;
    var ref;
    // if no repo/path/ref were provided, then exit
    if ((event.reponame === undefined) || (event.path === undefined) || (event.ref === undefined)) {
      if (callback !== undefined) callback(new Error('Missing repo/path/ref parameters'))
    } else {
      reponame = event.reponame;
      path = event.path;
      ref = event.ref;
    }
    github.repos.getContent({
      // get content of commit
      user: user,
      repo: reponame,
      path: path,
      ref: ref
    }, respond.bind(this));
    break;
  case 'getTree':
    // get the content of a tree
    var reponame;
    var sha;
    // if no repo/sha were provided, then exit
    if ((event.reponame === undefined) || (event.sha === undefined)) {
      if (callback !== undefined) callback(new Error('Missing repo/sha parameters'))
    } else {
      reponame = event.reponame;
      sha = event.sha;
    }
    github.gitdata.getTree({
      user: user,
      repo: reponame,
      sha: sha,
      recursive: true
    }, respond.bind(this))
    break;
  default:
  }
}
