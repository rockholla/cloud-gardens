#!/usr/bin/env python

import sys
import ruamel.yaml
from ruamel.yaml.scalarstring import PreservedScalarString, preserve_literal

def parse_value(value):
  if value == 'True' or value == 'False':
    return bool(value)
  else:
    try:
      return int(value)
    except ValueError:
      try:
        return float(value)
      except:
        return value

stream = open(sys.argv[1], 'r')
yaml = ruamel.yaml.load(stream, Loader=ruamel.yaml.RoundTripLoader)
keys = sys.argv[2].split('.')
toexec = 'yaml'
for key in keys:
  toexec += '["' + key + '"]'
value = parse_value(sys.argv[3])
if type(value) is str:
  toexec += ' = "' + value + '"'
else:

  toexec += ' = ' + str(value)
exec(toexec)

with open(sys.argv[1], 'w') as yamlfile:
  ruamel.yaml.dump(yaml, yamlfile, indent=2, Dumper=ruamel.yaml.RoundTripDumper, default_flow_style=False)
