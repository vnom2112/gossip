#!/usr/bin/python

import os
import sys
import time
import urllib2
import requests
import json
import random
from requests.exceptions import HTTPError
from requests.exceptions import ConnectionError


nodeID = sys.argv[1]
uuID = sys.argv[2]
SERVER_IP = "54.152.227.132"
SLEEP_TIME = 2


def getPeer():
	try:
		res = requests.get('http://'+ SERVER_IP + ':3000/peers/' + nodeID)
		res.raise_for_status()
	except HTTPError, ConnectionError:
		return None
	else:
		##print res.text
		peers = json.loads(res.text)
		if not len(peers) > 0:
			return None
		elif len(peers) == 1:
			return peers[0]
		else:
			currentPeer = peers[random.randint(0,len(peers)-1)]
			return currentPeer

def prepareMessage():
	#prepare want or rumor
	res = urllib2.urlopen('http://' + SERVER_IP + ':3000/messages/' + nodeID)
	myMessages = json.loads(res.read())
	if len(myMessages) > 0:
		#create messageJson
		message.isRumor = True
		message.json = messageJson
	else:
		messageType = random.randint(0,1)
		if messageType == 0:
			message.isRumor = True
			#grab random rumor from known messages
			res = urlib2.urlopen('http://'+ SERVER_IP + ':3000/rumors/' + nodeID)
			rumors = json.loads(res.read())
			rumor = rumors[random.randint(0, len(rumors) - 1)]
			#prepare message json
			message.json = rumorJson
		else:
			message.isRumor = False
			#get list of all most recent rumors
			#prepare json
			#message.json = wantJson
	#return message

def saveMessages(messageJson):
	requests.post('http://'+ SERVER_IP + ':3000/gossip/' + nodeID, messageJson)

def getNextMessageOrderId(peer):
	nextMessage = -1
	try:
		res = requests.get('http://' + SERVER_IP + ':3000/sent/' + \
		nodeID + '?friendID=' + peer['nodeID'] + '&messageID=' + uuID)
		res.raise_for_status()
	except HTTPError:
		pass
	else:
		##print 'Last Sent Message: ' + res.text
		lastSentMessages = json.loads(res.text)
		if len(lastSentMessages) > 0:
			lastSentMessage = lastSentMessages[0]
			if len(lastSentMessage) > 0:
				nextMessage = int(lastSentMessage['lastOrderID'])
	return nextMessage

def sendNextMessage(peer, nextMessage):
	isMessageSent = False
	try:
		sentRequest = requests.get('http://' + SERVER_IP + ':3000/sent/' \
				+ nodeID + '?friendID=' + peer['nodeID'])
		sentRequest.raise_for_status()
	except:
		pass
	else: 
		##print messageResponse.text
		lastMessageSent = json.loads(sentRequest.text)
		if not len(lastMessageSent) > 0:
			lastOrderID = -1
		else:
			lastOrderID = lastMessageSent[0]['lastOrderID']
		try:
			print "Sending next message: " + str(lastOrderID)
			newRumorRequest = requests.get('http://' + SERVER_IP + ':3000/rumors/rest/' + \
			nodeID + '?messageID=' + uuID + '&orderID=' + str(lastOrderID))
		except HTTPError:
			pass
		else:
			newRumors = json.loads(newRumorRequest.text)
			if len(newRumors) > 0:
				for rumorToSend in reversed(newRumors):
					try:
						print "posting data to peer"
						messageID = rumorToSend['messageID'] + ':' + str(rumorToSend['orderID'])
						originator = rumorToSend['friendID']
						text = rumorToSend['text']
						endpoint = 'http://' + SERVER_IP + '/gossip/' + nodeID
						messageData = {'Rumor': {'MessageID': messageID,'Originator': originator,'Text': text},'EndPoint': endpoint}
						##print "json data: " + json.dumps(messageData)
						headers = {'content-type': 'application/json'}
						gossipResponse = requests.post(peer['url'], data=json.dumps(messageData), headers=headers)
						gossipResponse.raise_for_status()
					except HTTPError:
						print 'failed to post to peer'
						isMessageSent = False
					else:
						try:
							sentResponse = requests.post('http://' + SERVER_IP + ':3000/sent/' \
							+ nodeID + '?friendID=' + peer['nodeID'], data=json.dumps(rumorToSend), \
							headers=headers)
						except HTTPError:
							print "Could not save 'sent update'"
							isMessageSent = False
							break
						else:
							isMessageSent = True
			else:
				isMessageSent = False
	return isMessageSent





'''messageToSend = None
if len(myMessages) > 0:
if nextMessage == -1:
messageToSend = myMessages[0]
else:
for message in myMessages:
	if message['orderID'] == nextMessage + 1:
		messageToSend = message
if messageToSend is not None:
##print 'sending: ' + messageToSend['messageID'] + ":" + str(messageToSend['orderID'])
try:
	##print "posting data to peer"
	messageID = uuID + ':' + str(messageToSend['orderID'])
	originator = nodeID
	text = messageToSend['text']
	endpoint = 'http://' + SERVER_IP + ':3000/gossip/' + nodeID
	messageData = {'Rumor': {'MessageID': messageID,'Originator': originator,'Text': text},'EndPoint': endpoint}
	##print "json data: " + json.dumps(messageData)
	headers = {'content-type': 'application/json'}
	gossipResponse = requests.post(peer['url'], data=json.dumps(messageData), headers=headers)
	gossipResponse.raise_for_status()
except HTTPError:
	##print 'failed to post to peer'
	pass
else:
	##print "success!  Updating sent messages to peer"
	try:
		sentResponse = requests.post('http://' + SERVER_IP + ':3000/sent/' \
		+ nodeID + '?friendID=' + peer['nodeID'], data=json.dumps(messageData), \
		headers=headers)
	except HTTPError:
		##print "Could not save 'sent update'"
		pass
	else:
		isMessageSent = True
else:
##print "No messages found"
pass'''

def sendRumor(peer):
	#get all rumor ids with highest order ids that are not our own
	try:
		rumorsRequest = requests.get('http://' + SERVER_IP + ':3000/rumors/ids/' + nodeID + '?friendID=' + peer['nodeID'])
		sentRequest = requests.get('http://' + SERVER_IP + ':3000/sent/' \
				+ nodeID + '?friendID=' + peer['nodeID'])
		peerRequest = requests.get('http://' + SERVER_IP + ':3000/peers/' + nodeID)
		rumorsRequest.raise_for_status()
		sentRequest.raise_for_status()
		peerRequest.raise_for_status()
	except HTTPError:
		#print "could not get all rumors"
		pass
	else:
		#print 'getting all rumors'
		allRumors = json.loads(rumorsRequest.text)
		sentMessages = json.loads(sentRequest.text)
		print sentRequest.text;
		peers = json.loads(peerRequest.text)
		newRumorOrderID = None
		#print 'sent rumors: ' + sentRequest.text
		while newRumorOrderID is None and len(allRumors) > 0:
			rumorIndex = 0
			if len(allRumors) > 1:
				rumorIndex = random.randint(0,len(allRumors) - 1)
			nextRumor = allRumors[rumorIndex]
			del allRumors[rumorIndex]
			rumorFound = False
			for lastRumor in sentMessages:
				if nextRumor['_id'] == lastRumor['messageID']:
					rumorFound = True
					if nextRumor['orderID'] > lastRumor['lastOrderID']:
						newRumorOrderID = lastRumor['lastOrderID']
			if not rumorFound:
				newRumorOrderID = -1
		if newRumorOrderID is not None:
			try:
				newRumorRequest = requests.get('http://' + SERVER_IP + ':3000/rumors/rest/' + \
				nodeID + '?messageID=' + nextRumor['_id'] + '&orderID=' + str(newRumorOrderID))
			except HTTPError:
				pass
			else:
				newRumors = reversed(json.loads(newRumorRequest.text))
				for rumorToSend in newRumors:
					try:
						##print "posting data to peer"
						messageID = rumorToSend['messageID'] + ':' + str(rumorToSend['orderID'])
						originator = rumorToSend['friendID']
						text = rumorToSend['text']
						endpoint = ""
						for myPeer in peers:
							if myPeer['uuID'] == messageID:
								endpoint = rumorToSend['endPoint']
						messageData = {'Rumor': {'MessageID': messageID,'Originator': originator,'Text': text},'EndPoint': endpoint}
						##print "json data: " + json.dumps(messageData)
						headers = {'content-type': 'application/json'}
						gossipResponse = requests.post(peer['url'], data=json.dumps(messageData), headers=headers)
						gossipResponse.raise_for_status()
					except HTTPError:
						#print 'failed to post to peer'
						pass
					else:
						try:
							sentResponse = requests.post('http://' + SERVER_IP + ':3000/sent/' \
							+ nodeID + '?friendID=' + peer['nodeID'], data=json.dumps(rumorToSend), \
							headers=headers)
						except HTTPError:
							##print "Could not save 'sent update'"
							break
						else:
							pass

	#see if you have sent them the latest by selecting from db with order id higher than the latest
	#if no rumors in result then repeat until all rumor ids run out
	#if not
		#get next message
		#send it to peer url
		#update sent number

def sendWant(peer):
	try:
		rumorsRequest = requests.get('http://' + SERVER_IP + ':3000/rumors/all/' + nodeID)
		rumorsRequest.raise_for_status()
	except HTTPError:
		#print "could not get all rumors"
		pass
	else:
		allRumors = json.loads(rumorsRequest.text)
		wantRequest = {'EndPoint': 'http://' + SERVER_IP + ':3000/gossip/' + nodeID}
		wantList = {}
		currentMessageID = ''
		for message in allRumors:
			if currentMessageID != message['messageID']:
				currentMessageID = message['messageID']
				wantList[currentMessageID] = message['orderID']
		wantRequest['Want'] = wantList
		headers = {'Content-Type': 'application/json'}
		try:
			wantResponse = requests.post(peer['url'], data=json.dumps(wantRequest), headers=headers)
			wantResponse.raise_for_status()
		except HTTPError:
			#print 'Want request failed'
			pass



while True:
	peer = getPeer()
	if peer is not None:
		if not sendNextMessage(peer, getNextMessageOrderId(peer)):
			#print "No messages to send"
			isRumor = random.randint(0,1)
			if isRumor == 0:
				sendRumor(peer)
			else:
				sendWant(peer)
	time.sleep(SLEEP_TIME)