#!/bin/bash
if [[ -z $(test | sed 's/ //') ]]; then
  echo "empty"
fi
echo $?
