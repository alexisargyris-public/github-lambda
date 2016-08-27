[![Build Status](https://semaphoreci.com/api/v1/alexisargyris/github-lambda/branches/master/shields_badge.svg)](https://semaphoreci.com/alexisargyris/github-lambda)

# github-lambda
a simple wrapper of selected [node-github](https://github.com/mikedeboer/node-github) functions for aws lambda

## authentication

A file named 'creds.js' is required with the following content:

    const creds = {
      'user': '<github-user-name>',
      'token': '<github-token>'
    };
    exports.creds = creds;

## github api

The following functions are covered:

* [getAll](https://mikedeboer.github.io/node-github/#api-repos-getAll) / getAll(): get all repos of the authenticated user
* [getCommits](https://mikedeboer.github.io/node-github/#api-repos-getCommits) / getCommits(repo, sha): get the commits of a repo
* [getCommit](https://mikedeboer.github.io/node-github/#api-repos-getCommit) / getCommit(repo, sha): get the content of a commit
* [getContent](https://mikedeboer.github.io/node-github/#api-repos-getContent) / getContent(repo, path, ref): get the content of a file
* [getTree](https://mikedeboer.github.io/node-github/#api-gitdata-getTree) / getTree(repo, sha): get the content of a tree
