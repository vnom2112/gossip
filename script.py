#!/usr/bin/python

import os
import sys
import time
import urllib2



count = 0

while True:
	time.sleep(5)
	req = urllib2.Request('http://localhost:3000/home')
	response = urllib2.urlopen(req)
	count += 1

