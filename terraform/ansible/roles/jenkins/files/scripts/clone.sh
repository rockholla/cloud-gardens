#!/bin/bash

set -e

echo "Cloning or updating the local clone of ${repo}/${branch}..."

mkdir -p ~/.garden/repos-branches
mkdir -p ~/.garden/deployments
cd ~/.garden/repos-branches
if [ ! -d $repo_branch_id ]; then
  git clone "git@github.com:${repo}" $repo_branch_id
fi
cd $repo_branch_id
git reset --hard HEAD
git fetch
git checkout $branch
git pull origin $branch
if [ ! -d .gardens ]; then
  cd ~/
  rm -rf ~/.garden/repos-branches/$repo_branch_id
  echo "This repo/branch is not configured to be deployed to a cloud garden, please create a .gardens directory with appropriate contents.  For more info, see https://github.com/rockholla/cloud-gardens."
  exit 1
fi
git submodule foreach --recursive 'git fetch --tags'
git submodule update --init --recursive

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="${eval_path}/.gardens"
eval_type="after_clone"
. "${scripts_dir}/eval.sh"
