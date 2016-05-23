[![Build Status](https://travis-ci.org/spark/cli-library-manager.svg?branch=master)](https://travis-ci.org/spark/cli-library-manager)
[![Coverage Status](https://coveralls.io/repos/github/spark/cli-library-manager/badge.svg?branch=master)](https://coveralls.io/github/spark/cli-library-manager?branch=master)

# CLI Library Manager

This is a node module for managing repositories of firmware libraries. It supports two types of repositories:

- a local repo, stored as a directory on the file system

- Build library repo (http://build.particle.io)

The local library repo is writable, while Build is read-only.

The module provides library management:

- enumerate libraries in a repository

- add a library to a repository (such as reading a library from Build and adding it to the local repository)

- TODO: remove library is not supported in this prototype.


# Development Deets

- Node 6.x
- ECMA 2015
- full unit test coverage, xtensive use of stubbing for focused unit tests.
- integration tests (these require access to a running instance of Build.)

When changing the code please adhere to test-first principles - first change the unit tests and integration tests to
fail without your intended change, and then make the change, tweaking code/tests until green is seen.



