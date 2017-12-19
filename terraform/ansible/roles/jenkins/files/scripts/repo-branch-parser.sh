#!/bin/bash

repo_and_branch=(${RepoBranch//:::/ })
repo=${repo_and_branch[0]}
repo_formatted="${repo/\//-}"
branch=${repo_and_branch[1]}
branch_formatted="${branch//\//-}"
repo_branch_id="${repo_formatted}-${branch_formatted}"