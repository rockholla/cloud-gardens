#!/bin/bash

rootexec=${1:-true}

if $rootexec; then
  set -e
  source $JENKINS_HOME/.profile
  source $JENKINS_HOME/scripts/common-variables.sh
  source $JENKINS_HOME/scripts/repo-branch-parser.sh
fi

clone=${clone:-true}

echo "Building ${repo_branch_id}..."

if [ $clone == true ] || [ ! -d $JENKINS_HOME/.garden/repos-branches/$repo_branch_id ]; then
  . $JENKINS_HOME/scripts/clone.sh
fi

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="${eval_path}/.gardens"
eval_type="build"
. "${scripts_dir}/eval.sh"
