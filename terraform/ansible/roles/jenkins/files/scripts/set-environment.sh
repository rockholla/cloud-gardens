#!/bin/bash

jenkins_profile="$JENKINS_HOME/.profile"
if [ ! -f $jenkins_profile ]; then
  touch $jenkins_profile
fi
grep -q "^export $1" $jenkins_profile && perl -pi -e 's|^export '"$1"'.*|export '"$1"'='"$2"'|' $jenkins_profile || printf "\nexport $1=$2" >> $jenkins_profile
