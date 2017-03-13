# Tribal Garden: plant your Modern Tribe project, watch it grow

There are a few key tenets for growing projects and the infrastructure to support them at Modern Tribe:

1. The infrastructure running any given environment, be it your local development or production, should be identical and disposable
2. Every project and developer should be willing to adopt some practices around Continuous Integration and Deployment:
    * Some set of automated tests should be a part of every project
    * Developers should have a way to run local builds and tests prior to committing work to the common repo
    * Commits should be small and happen frequently
    * Project commits should trigger builds, testing, and other tasks relevant to the project on an integration server

# Creating a Project

Should require a single step
What it should do:
1. Create new repo from square one
2. Create environment resources:
    - dev and staging infrastructure
    - connect to

# Architecture

Project source:
    Get rid of submodules, use dependency management with composer/similar instead (maybe a script to help convert existing projects?), what about base docker images too?
    implement common testing strategy
    frontend build strategy
    cache prefixes?
    common branching strategy
Rely on third party services whenever possible, these services should have APIs and be reasonably easy to migrate away from in the future
    Datadog for monitoring
    Blackfire for profiling?
    AWS services, cloudwatch
what about persistent file strategy, try to go with s3 across all projects, come up with an easy way for projects to convert to this?



