#!/usr/bin/python
################################################################################
# Author			: Michael Lathion
# Creation date 	: 06.07.2015
# Project			: OPEN PROJECT API CLIENT
# Langage			: Python
# Filename			: api.py
# Target		 	: Windows 7
# Description		: Tornado Web Server implementation for Open Project Client
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
################################################################################

import time, datetime, commands, os, sys
import subprocess, string, fileinput, re, shutil
import requests
import json

##Define Type _links
linkOF 				= {'href':'/api/v3/types/6'}
linkLivraison 		= {'href':'/api/v3/types/10'}
linkAchatMat		= {'href':'/api/v3/types/3'}
linkAchatPochoir	= {'href':'/api/v3/types/8'}
linkCdePCB			= {'href':'/api/v3/types/2'}

##Define Customfields
telsaClient = 'customField1'

##Define http headers for JSON
headers = {'Content-type':'application/JSON'}

##Load server address + api key from json config file
f = open('config/config.json', 'r')
config = json.loads(f.read())
f.close()
server = config['server']
apikey = config['apikey']

##server = "https://akaelcompa.openproject.com"
##apikey = '236ea9ff16eec25994066eefe93bd1b138031ca9'



def getUserList():
	"""Retrieve the users list from Open Project"""
	r = requests.get(server+"/api/v3/projects/1/available_assignees", auth=('apikey', apikey))
	userList = json.loads(r.text)
	return userList
	
def getCustomerList():
	"""Retrieveve the customers list from Open Project"""
	r = requests.post(server+"/api/v3/projects/1/work_packages/form", auth=('apikey', apikey))
	form = json.loads(r.text)
	customerList= form['_embedded']['schema'][telsaClient]['_links']['allowedValues']
	return customerList

def createOF(numeroOF, nomClient, projectID, totalQty, dateOF, description, assigneeLivraison):
	"""Create one work_package Ordre de fabrication + 1x work package livraison"""
	
	##Initialize a dict object with OF values
	OF = {}
	OF['_links'] = {}
	OF['_links'][telsaClient] = {}
	OF['subject'] = numeroOF
	OF['_links'][telsaClient]['href'] = nomClient
	##OF['customField2'] = totalQty
	OF['_links']['type'] = linkOF
	OF['description'] = {}
	OF['description']['raw'] = description
	
	## Create "Ordre de fabrication"
	r = requests.post(server+"/api/v3/projects/" + projectID + "/work_packages/", auth=('apikey', apikey), data=json.dumps(OF), headers=headers)
	reply = json.loads(r.text)
	
		
	## Set "Ordre de fabrication" dueDate
	OF['dueDate'] = dateOF
	selfId = reply['id']
	OF['lockVersion'] = reply['lockVersion']
	r = requests.patch(server + "/api/v3/work_packages/" + str(selfId), auth=('apikey', apikey), data=json.dumps(OF), headers=headers)

	
	##Create "Livraison"
	OF['_links']['type'] = linkLivraison
	OF['_links']['assignee'] = {}
	OF['_links']['assignee']['href'] = assigneeLivraison
	OF['parentId'] = selfId
	OF.pop('dueDate')
	r = requests.post(server+"/api/v3/projects/" + projectID + "/work_packages/", auth=('apikey', apikey), data=json.dumps(OF), headers=headers)

	reply = json.loads(r.text)
	
	## Set "Livraison" dueDate
	OF['dueDate'] = dateOF
	selfId = reply['id']
	OF['lockVersion'] = reply['lockVersion']
	r = requests.patch(server + "/api/v3/work_packages/" + str(selfId), auth=('apikey', apikey), data=json.dumps(OF), headers=headers)
	OF.pop('lockVersion')
	OF.pop('dueDate')

	reply_code = r.status_code
	
	return (reply_code, OF)
	
def createOption(OF, dueDate, projectID, assignee, link):
	"""Create options work package, take care, the OF dict should be initialized first with createOF() """
	
	##Create work package
	OF['_links']['type'] = link
	OF['_links']['assignee'] = {}
	OF['_links']['assignee']['href'] = assignee
	r = requests.post(server+"/api/v3/projects/" + projectID + "/work_packages/", auth=('apikey', apikey), data=json.dumps(OF), headers=headers)
	reply = json.loads(r.text)
	
	## Set dueDate
	OF['dueDate'] = dueDate
	selfId = reply['id']
	OF['lockVersion'] = reply['lockVersion']
	r = requests.patch(server + "/api/v3/work_packages/" + str(selfId), auth=('apikey', apikey), data=json.dumps(OF), headers=headers)
	OF.pop('lockVersion')
	OF.pop('dueDate')

	


