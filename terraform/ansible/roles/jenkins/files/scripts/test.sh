#!/bin/bash

rootexec=${1:-true}

if $rootexec; then
  set -e
  source $JENKINS_HOME/.profile
  source $JENKINS_HOME/scripts/common-variables.sh
  source $JENKINS_HOME/scripts/repo-branch-parser.sh
fi

clone=${clone:-true}

echo "Testing ${repo_branch_id}..."

if [ $clone == true ] || [ ! -d $JENKINS_HOME/.garden/repos-branches/$repo_branch_id ]; then
  . $JENKINS_HOME/scripts/clone.sh
fi

mkdir -p $JENKINS_HOME/.garden/.tests
sudo cp -r $JENKINS_HOME/.garden/repos-branches/$repo_branch_id $JENKINS_HOME/.garden/.tests/
eval_id="$repo_branch_id"
eval_path=".tests/${eval_id}"
eval_config_path="${eval_path}/.gardens"
eval_type="test"
. "${scripts_dir}/eval.sh"
