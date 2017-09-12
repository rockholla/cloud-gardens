#!/usr/bin/env python

import sys
import ruamel.yaml

def parse_value(value):
  if isinstance(value, bool):
    return str(value).lower()
  else:
    return value

with open(sys.argv[1], 'r') as stream:
  try:
    yaml = ruamel.yaml.safe_load(stream)
    key = sys.argv[2]
    keys = key.split('.')
    value = yaml
    for key in keys:
      value = value[key]
    print parse_value(value)
  except:
    print sys.exc_info()[0]
