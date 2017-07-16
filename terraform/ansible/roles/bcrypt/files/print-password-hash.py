#!/usr/bin/env python

import bcrypt
import sys

currenthash = sys.argv[1].encode('utf-8')
password = sys.argv[2].encode('utf-8')
if bcrypt.checkpw(password, currenthash):
  print currenthash
else:
  print bcrypt.hashpw(password, bcrypt.gensalt(prefix=b"2a"))