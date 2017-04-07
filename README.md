# Cloud Gardens: plant your projects, help them grow

*** **NOTE: this repo is currently a work in progress** ***

[![Build Status](https://travis-ci.org/rockholla/cloud-gardens.svg?branch=develop)](https://travis-ci.org/rockholla/cloud-gardens)

Requirements:

There are a few key tenets for growing projects and the infrastructure to support them:

1. The infrastructure running any given project, be it your local development or production, should be identical and disposable, immutable
2. Every project and developer should be willing to adopt some practices around Continuous Integration and Deployment:
    * Some set of automated tests should be a part of every project
    * Developers should have a way to run local builds and tests prior to committing work to the common repo
    * Commits should be small and happen frequently
    * Project commits should trigger builds, testing, and other tasks relevant to the project on an integration server

# How to be a Gardener

A Gardener oversees the creation and maintenance of gardens.  It's pretty easy to do as long as you have access to an AWS (or DigitalOcean supported soon) account where you'd like the garden to live.

Some requirements:

1. [Nodejs](https://nodejs.org)
2. [Terraform](https://www.terraform.io/intro/getting-started/install.html)
3. [Create a local named AWS profile](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-multiple-profiles)

Then run `node . help` to see the available commands.

You'll want to create your own configuration, and you can do so by running `node . init [name of your configuration]`.

Or you can simply make a new file named `local.js` or `local.json` in the `/config` directory based on `/config/default.json`.  Refer to the [npm config package](https://www.npmjs.com/package/config) for more options on config overriding.

# WIP: Some diagrams illustrating the intention here...

A garden is an encapsulated ecosystem containing any number of isolated environments (dev, test, production, etc.), and integration tools and services for controlling these environments.  A garden is capable of serving many environments for many projects.

![Garden Diagram](docs/diagram.jpg)

# An example Workflow

Here's what your development and release workflow might look like making use of a garden

![An exaple workflow](docs/example-workflow.jpg)