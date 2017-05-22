[![Build Status](https://semaphoreci.com/api/v1/alexisargyris/github-lambda/branches/master/shields_badge.svg)](https://semaphoreci.com/alexisargyris/github-lambda)

# github-lambda
a simple, promise-based, wrapper of selected [node-github](https://github.com/mikedeboer/node-github) functions for aws lambda.

## authentication

A file named 'creds.js' is required with the following content:

    const creds = {
      'user': '<github-user-name>',
      'token': '<github-token>'
    };
    exports.creds = creds;

## node-github api

The following commands are supported:

* `sources()`: get all user repos.
* `list(reponame)`: get all commits of selected repo.
* `single(reponame, commitsha)`: get content of selected commit.
