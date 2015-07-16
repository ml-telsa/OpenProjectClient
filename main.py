#!/usr/bin/python
################################################################################
# Author			: Michael Lathion
# Creation date 	: 06.07.2015
# Project			: OPEN PROJECT API CLIENT
# Langage			: Python
# Filename			: main.py
# Target		 	: Windows 7
# Description		: Tornado Web Server implementation for Open Project Client
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
################################################################################

import tornado.ioloop
import tornado.web
import tornado.websocket
import time, datetime, os, sys
import string, fileinput, re, shutil
import threading
import serv
import api


#Define Tornado webserver API
application = tornado.web.Application([
	(r"/prefs",serv.prefs),
	(r"/users",serv.users),
	(r"/wp",serv.wp),
	(r"/createOF", serv.createOF),
	(r"/prefsValidation", serv.prefsValidation),
	(r"/usersValidation", serv.usersValidation),
	(r"/(.*)", tornado.web.StaticFileHandler, {"path": "www/","default_filename": "index.html"}),
],debug=False)

#Function to start Tornado webserver
def start_tornado():
	application.listen(8080,"0.0.0.0")
	tornado.ioloop.IOLoop.instance().start()


#Launch Tornado in a new thread
thread = threading.Thread(target=start_tornado)
thread.start()
