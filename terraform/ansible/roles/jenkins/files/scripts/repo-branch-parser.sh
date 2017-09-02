#!/bin/bash

repo_and_branch=(${RepoBranch//:::/ })
repo=${repo_and_branch[0]}
branch=${repo_and_branch[1]}
branch_formatted="${branch/\//-}"
repo_branch_id="${repo}-${branch_formatted}"