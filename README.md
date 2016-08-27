[![Build Status](https://semaphoreci.com/api/v1/alexisargyris/github-lambda/branches/master/shields_badge.svg)](https://semaphoreci.com/alexisargyris/github-lambda)

# github-lambda
a wrapper of some github api functions  for aws lambda

## authentication

A file called 'creds.js' is required with the following content:

    const creds = {
      'user': '<github-user-name>',
      'token': '<github-token>'
    };
    exports.creds = creds;

## api

The following functions are covered:

* [getAll()](https://mikedeboer.github.io/node-github/#api-repos-getAll): get all repos of the authenticated user
* [getCommits(repo, sha)](https://mikedeboer.github.io/node-github/#api-repos-getCommits): get the commits of a repo
* [getCommit(repo, sha)](https://mikedeboer.github.io/node-github/#api-repos-getCommit): get the content of a commit
* [getContent(repo, path, ref)](https://mikedeboer.github.io/node-github/#api-repos-getContent): get the content of a file
* [getTree(repo, sha)](https://mikedeboer.github.io/node-github/#api-gitdata-getTree): get the content of a tree
