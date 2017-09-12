#!/bin/bash

set -e

source ~/.profile
cd ~/scripts
source common-variables.sh
source repo-branch-parser.sh

clone=${clone:-true}

echo "Testing ${repo_branch_id}..."

if [ $clone == true ] || [ ! -d ~/.garden/repos-branches/$repo_branch_id ]; then
  . ~/scripts/clone.sh
fi

mkdir -p ~/.garden/test
cp -r ~/.garden/repos-branches/$repo_branch_id ~/.garden/test/$repo_branch_id
eval_id="$repo_branch_id"
eval_path="test/${eval_id}"
eval_config_path="${eval_path}/.gardens"
eval_type="test"
. "${scripts_dir}/eval.sh"
