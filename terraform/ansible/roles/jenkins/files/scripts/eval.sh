#!/bin/bash

returndir=$(pwd)
cd $scripts_dir
./yaml-reader.py ~/.garden/$eval_config_path/config.yml scripts.${eval_type} > "/tmp/${eval_id}.${eval_type}.sh"
if [[ -z $(cat "/tmp/${eval_id}.${eval_type}.sh" | sed 's/ //') ]]; then
  echo "The ${eval_id}.${eval_type} script block is empty, so not evaluating anything"
else
  chmod +x "/tmp/${eval_id}.${eval_type}.sh"
  echo "Executing project-defined ${eval_type} script block..."
  cd ~/.garden/$eval_path
  . "/tmp/${eval_id}.${eval_type}.sh"
  rm "/tmp/${eval_id}.${eval_type}.sh"
fi
cd $returndir
