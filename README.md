# Cloud Gardens: plant your projects in the cloud, help them grow

There are a few key tenets for growing projects and the infrastructure to support them:

1. The infrastructure running any given project, be it your local development or production, should be identical and disposable, immutable
2. Every project and developer should be willing to adopt some practices around Continuous Integration and Deployment:
    * Some set of automated tests should be a part of every project
    * Developers should have a way to run local builds and tests prior to committing work to the common repo
    * Commits should be small and happen frequently
    * Project commits should trigger builds, testing, and other tasks relevant to the project on an integration server

# How to be a Groundskeeper

A Groundskeeper oversees the creation and maintenance of gardens.  It's pretty easy to do as long as you have access to an AWS or DigitalOcean account where you'd like the garden to live.

Some requirements:
1. Node/npm installed

Then run `node . help` to see the available commands.

If you'd like to use your own configuration for building and maintaining, feel free to make your own file in the `/config` directory (config is loaded with the [npm config package](https://www.npmjs.com/package/config) and can inherit from the `default.js` config already there).  You just need to set the `NODE_ENV` variable to what you named your config file, something like:

```
NODE_ENV=myenvironment node . plant mygarden
```

# Diagram of a garden

A garden is an encapsulated ecosystem containing any number of isolated environments (dev, test, production, etc.), and integration tools and services for controlling these environments

![Garden Diagram](https://raw.githubusercontent.com/rockholla/cloud-gardens/master/docs/diagram.jpg)

# An example Workflow

Here's what your development and release workflow might look like making use of a garden

![An exaple workflow](https://raw.githubusercontent.com/rockholla/cloud-gardens/master/docs/example-workflow.jpg)