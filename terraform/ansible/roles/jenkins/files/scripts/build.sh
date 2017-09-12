#!/bin/bash

set -e

source ~/.profile
cd ~/scripts
source common-variables.sh
source repo-branch-parser.sh

clone=${clone:-true}

echo "Building ${repo_branch_id}..."

if [ $clone == true ] || [ ! -d ~/.garden/repos-branches/$repo_branch_id ]; then
  . ~/scripts/clone.sh
fi

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="${eval_path}/.gardens"
eval_type="build"
. "${scripts_dir}/eval.sh"
