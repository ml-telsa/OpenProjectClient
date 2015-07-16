#!/usr/bin/python
################################################################################
# Author			: Michael Lathion
# Creation date 	: 06.07.2015
# Project			: OPEN PROJECT API CLIENT
# Langage			: Python
# Filename			: serv.py
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
import time, datetime, commands, os, sys, socket
import subprocess, string, fileinput, re, shutil
import api
import json
import ast


class prefs(tornado.web.RequestHandler):
    def get(self):
	hostname = socket.gethostname()
	date = subprocess.check_output("date /t", shell=True)
	f = open('config/config.json', 'r')
	config = json.loads(f.read())
	f.close()
	serverAddress = config['server'] 
	apikeyPrefs = config['apikey']
	self.render("www/prefs.html", title="Preferences", 
			hostname = hostname,
			date = date,
			serverAddress = serverAddress,
			apikey = apikeyPrefs,
		)

class prefsValidation(tornado.web.RequestHandler):
    def post(self):
			serverAd = self.get_argument("serverAddress")
			myapikey = self.get_argument("apikey")
			conf = {}
			conf['apikey'] = myapikey
			conf['server'] = serverAd
			f = open('config/config.json', 'w')
			f.write(json.dumps(conf))
			f.close()
			self.render("www/prefsvalid.html", title="Preferences ok")			
			
class users(tornado.web.RequestHandler):
    def get(self):
	hostname = socket.gethostname()
	date = subprocess.check_output("date /t", shell=True)
	f = open('config/config.json', 'r')
	config = json.loads(f.read())
	f.close()
	self.render("www/users.html", title="Preferences", 
			hostname = hostname,
			date = date,
			userListPrefs = api.getUserList(),
		)

class usersValidation(tornado.web.RequestHandler):
    def post(self):
			defaultUserLivraison = self.get_argument("defaultUserLivraison")
			defaultUserComposant = self.get_argument("defaultUserComposant")
			defaultUserPochoir = self.get_argument("defaultUserPochoir")
			defaultUserPCB = self.get_argument("defaultUserPCB") 
			
			conf = {}
			
			f = open('config/config.json', 'r')
			config = json.loads(f.read())
			f.close()
			
			conf['apikey'] = config['apikey']
			conf['server'] = config['server']
			
			conf['defaultUsers'] = {}
			conf['defaultUsers']['defaultUserLivraison'] = defaultUserLivraison
			conf['defaultUsers']['defaultUserComposant'] = defaultUserComposant
			conf['defaultUsers']['defaultUserPCB'] = defaultUserPCB
			conf['defaultUsers']['defaultUserPochoir'] = defaultUserPochoir
			
			f = open('config/config.json', 'w')
			f.write(json.dumps(conf))
			f.close()
			self.render("www/prefsvalid.html", title="Preferences ok")	

class wp(tornado.web.RequestHandler):
    def get(self):
	hostname = socket.gethostname()
	date = subprocess.check_output("date /t", shell=True)
	
	f = open('config/config.json', 'r')
	config = json.loads(f.read())
	f.close()
	
	defaultUserLivraison = ast.literal_eval(config['defaultUsers']['defaultUserLivraison'])
	defaultUserComposant = ast.literal_eval(config['defaultUsers']['defaultUserComposant'])
	defaultUserPochoir = ast.literal_eval(config['defaultUsers']['defaultUserPochoir'])
	defaultUserPCB = ast.literal_eval(config['defaultUsers']['defaultUserPCB'])
	
	self.render("www/wp.html", title="Creation OF", 
			hostname = hostname,
			date = date,
			userListWp = api.getUserList(),
			customerListWp = api.getCustomerList(),
			defaultUserPochoir = defaultUserPochoir,
			defaultUserPCB = defaultUserPCB,
			defaultUserComposant = defaultUserComposant,
			defaultUserLivraison = defaultUserLivraison,			
		)
		
class createOF(tornado.web.RequestHandler):
    def post(self):
				numeroOF = self.get_argument("numeroOF")
				nomClient = self.get_argument("nomClient")
				projectID = self.get_argument("projectID")
				totalQty = self.get_argument("totalQty")
				dateOF = self.get_argument("dateOF")
				description = tornado.escape.xhtml_escape(self.get_argument("description"))
				assigneeLivraison = self.get_argument("assigneeLivraison")
				
				reply_code, OF = api.createOF(numeroOF, nomClient, projectID, totalQty, dateOF, description, assigneeLivraison)
				
				if reply_code == 200:
					self.render("www/success.html", title="Work Package created", server = api.server)
				elif reply_code == 201:
					self.render("www/success.html", title="Work Package created", server = api.server)
				elif reply_code == 202:
					self.render("www/success.html", title="Work Package created", server = api.server)
				else:
					self.render("www/error.html", title="An error occured")
					
				if self.get_argument("achatMat") == "1":
					dateAchatMat = self.get_argument("dateAchatMat")
					assigneeAchatMat = self.get_argument("assigneeAchatMat")
					api.createOption(OF, dateAchatMat, projectID, assigneeAchatMat, api.linkAchatMat)
				
				if self.get_argument("cdePochoir") == "1":
					dateAchatPochoir = self.get_argument("dateCdePochoir")
					assigneeAchatPochoir = self.get_argument("assigneeAchatPochoir")
					api.createOption(OF, dateAchatPochoir, projectID, assigneeAchatPochoir, api.linkAchatPochoir)
					
				if self.get_argument("cdePCB")== "1":
					dateCdePCB = self.get_argument("dateCdePCB")
					assigneeAchatPCB = self.get_argument("assigneeAchatPCB")
					api.createOption(OF, dateCdePCB, projectID, assigneeAchatPCB, api.linkCdePCB)
				