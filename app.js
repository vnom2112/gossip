var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
//var passport = require('passport');
var util = require('util');
//var FoursquareStrategy = require('passport-foursquare').Strategy;
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');
var serveStatic = require('serve-static');
var request = require('request');
var moment = require('moment');
var uuid = require('node-uuid');
var url_parser = require('url');
var SERVER_IP = "54.152.227.132";

var app = express();
// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'bradycs462' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  /*app.use(passport.initialize());
  app.use(passport.session());*/
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var Peer = require('./model/peer');
var Rumor = require('./model/rumor');
var Relation = require('./model/relation');
var SentMessage = require('./model/sentMessage');

app.get('/', function(req, res) {
  res.redirect('/home');
});

app.get('/home', function(req,res) {
  console.log("hit home");
  /*var data = {};
  data.userAuthenticated = req.isAuthenticated();
	User.find(function(err, users) {
    data.users = users;
		res.render('home', {data: data});	
	});*/
	res.render('home');
});

app.get('/dashboard', function(req,response) {
  var data = {};
  data.userAuthenticated = req.isAuthenticated();
  data.user = req.user;
	User.find({username: req.query.user}, function(err, users) {
		//console.log(JSON.stringify(users, undefined, 2));
    data.user = users[0];
    if(req.query.user == req.user) {
      /*console.log("Getting all checkins.");
      request('https://api.foursquare.com/v2/users/self/checkins?oauth_token=' + user.token + "&v=20150202",
        function(error, res, body) {
          if(!error && res.statusCode == 200) {
            //console.log("Checkin response: " + body);
            var result = JSON.parse(body);
            if(result.response.checkins.items) {
              console.log("Checkins: " + result.response.checkins.items.length);
              user.checkins = result.response.checkins.items;
              result.response.checkins.items.forEach(function(el, index) {
                el.user = user.username;
                el.checkinId = el.id;
                CheckIn.update({checkinId: el.checkinId}, el, {upsert:true}, function(err, numberAffected, raw) {
                  if(err) {
                    console.log("Could not save checkins");
                  }
                });
              });
            }
          }
          data.displayUser = user;
          response.render('dashboard', {data: data, moment: moment});
      });
      response.render('dashboard', {data: data})*/
      response.render('dashboard', {data: data});
    } else {
      /*CheckIn.find({user: req.query.user}).sort('-createdAt').limit(1).exec(function(err, result) {
        user.checkins = result;
        data.displayUser = user;
        response.render('dashboard', {data: data, moment: moment});
      });*/
      response.render('home');
    }
    	//response.render('dashboard', {data: data});
	});
	//console.log(JSON.stringify(user,undefined, 2));
	
});

app.get('/stop/:nodeID', function(req,res) {
	//req.logout();
  var nodeID = req.params.nodeID;
  if(global.processes && global.processes[nodeID]) {
    global.processes[nodeID].kill('SIGINT');
    console.log('killed running process: ' + nodeID);
    delete global.processes[nodeID];
  }
	res.redirect('/dashboard/' + nodeID);
});

app.get('/dashboard/:nodeID', function(req, res) {
  var nodeID = req.params.nodeID;
  console.log("create/login node= " + nodeID);

  Peer.find({nodeID: nodeID}, function(err, currentNode) {

    if(!currentNode.length) {
      Peer.find({}, function(err, allPeers) {
        if(allPeers.length) {
          var firstFriend = allPeers[0];
          var newRelation1 = new Relation({nodeID: nodeID, friendID: firstFriend.nodeID});
          //var newRelation2 = new Relation({nodeID: firstFriend.nodeID, friendID: nodeID});
          newRelation1.save(function(err, relation1) {
            //console.log("saved first friend #1");
          });
          Relation.update({nodeID: firstFriend.nodeID, friendID: nodeID}, 
            {nodeID: firstFriend.nodeID, friendID: nodeID}, {upsert: true},function(err, relation2) {
            //console.log("saved first friend #2");
          });
        }
      });
      var newPeer = new Peer({
        nodeID: nodeID,
        uuID: uuid.v1(),
        url: "http://" + SERVER_IP + ":3000/gossip/" + nodeID
      });
      newPeer.save(function(err, newNode) {
        //console.log("new peer saved: " + nodeID);
        if(err) {
          console.log('Could not save new node');
          res.redirect('home');
        } else {
          gotoDashboard(req, res, newPeer);
        }
      });
    } else {
      gotoDashboard(req, res, currentNode[0]);
    }
  });  
});

function gotoDashboard(req, res, node) {
  Rumor.find({nodeID: node.nodeID, friendID: node.nodeID}, function(err, myMessages) {
    if(!err) {
      Rumor.find({nodeID: node.nodeID, friendID: {$ne: node.nodeID}}).sort('messageID orderID').exec(function(err, rumors){
        if(!err) {
          var status = false;
          if(global.processes && global.processes[node.nodeID]) {
            status = true;
          }
          var data = {
            node: node,
            messages: myMessages,
            rumors: rumors,
            status: status
          }
          res.render('dashboard', {data: data});
        } else {
          res.status(404).send('not found');
        }
      });
    } else {
      res.status(404).send('not found');
    }
  });
}

app.get('/start/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  if(global.processes === undefined) {
    global.processes = {};
  }

  if(global.processes[nodeID] === undefined) {
    Peer.find({nodeID: nodeID}, function(err, result) {
      if(!result.length) {
        res.status(404).send('node not found');
      } else if(!global.processes[nodeID]) {
        startNodeProcess(nodeID, result[0].uuID);
        res.redirect('/dashboard/' + nodeID);
      }
    });  
  }
});

app.post('/gossip/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  //console.log("recieving gossip: " + nodeID + "\n" + JSON.stringify(req.body));
  if(global.processes && global.processes[nodeID]) {
    if(req.body.Rumor ) {
      saveRumor(req, res, nodeID);
    } else {
      handleWant(req, res, nodeID);
    }
  } else{
    res.status(404).send("Not Found");
  }
  
});

app.get('/peers/:nodeID', function(req, res) {
  //console.log("getting peers");
  var nodeID = req.params.nodeID;
  Relation.find({nodeID: nodeID}, function(err, result){
    var friendIDs = [];
    if(result && result.length) {
      result.forEach(function(value, index) {
        friendIDs.push(value.friendID);
      });
      console.log(friendIDs);
      Peer.find().where('nodeID').in(friendIDs).exec(function(err, peers) {
        //console.log("found peers: " + peers);
        res.writeHead(200, { 'Content-Type': 'application/json'});
        res.write(JSON.stringify(peers, 0, 4));
        res.end();
      });
    } else {
      //console.log("empty peers list");
      res.writeHead(200, { 'Content-Type': 'application/json'});
      res.write(JSON.stringify([], 0, 4));
      res.end();
    }
  });
});

app.get('/sent/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  var friendID = req.query.friendID;
  var messageID = req.query.messageID;
  var options = {
    nodeID: nodeID,
    friendID: friendID
  };
  if(messageID !== undefined && messageID != "") {
    options.messageID = messageID
  }
  SentMessage.find(options, function(err, result){
    res.writeHead(200, { 'Content-Type': 'application/json'});
    res.write(JSON.stringify(result, 0, 4));
    res.end();
  });
});

app.post('/sent/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  var messageJson = req.body;
  console.log("Updating sent: " + JSON.stringify(messageJson, 0, 4));
  var friendID = req.query.friendID;
  //var uuID = messageJson.messageID.split(":");
  //console.log("Updating last sent message: " + nodeID + ", "
  // + friendID + ", " + uuID[0] +  ", " + uuID[1]);
  var sentMessage = {
      nodeID: nodeID,
      friendID: friendID,
      messageID: messageJson.messageID,
      lastOrderID: parseInt(messageJson.orderID)
    };
  SentMessage.update({nodeID: nodeID, friendID: friendID,
      messageID: messageJson.messageID}, sentMessage, {upsert: true}, function(err, result){
    if(err) {
      console.log('Sent Message update failed: ' +  err.message);
      res.status(500).send("Internal Server Error");
    } else {
      res.status(200).send("success");
    }
  }); 
});

app.get('/rumors/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  var friendID = req.query.friendID;
  Rumor.find({nodeID: nodeID, friendID: friendID}).sort('-orderID').exec(function(err, rumors){
    console.log("Getting rumors: " + JSON.stringify(rumors, 0, 4));
    res.writeHead(200, { 'Content-Type': 'application/json'});
    res.write(JSON.stringify(rumors, 0, 4));
    res.end();
  });
});

app.post('/message/new/:nodeID', function(req, res) {
  var nodeID = req.params.nodeID;
  var messageText = req.body.text;
  Rumor.aggregate([{'$match': {'nodeID': nodeID, 'friendID': nodeID}},
    {'$group': {'_id': "$messageID", 'orderID': {'$max': '$orderID'}}}]).exec(function(err, message){
      if(message != undefined && message.length > 0) {
        console.log("SAVING MESSAGE: " + message[0]._id + ":" + (message[0].orderID + 1));
        var messageToSave = new Rumor({
            nodeID: nodeID,
            messageID: message[0]._id,
            friendID: nodeID,
            text: messageText,
            orderID: message[0].orderID + 1
        });
        console.log(JSON.stringify(messageToSave, 0, 4));
        messageToSave.save(function(err, result) {
          if(err) {
            console.log('Failed to save new message: ' + err.message);
          }
        });
      } else {
        Peer.findOne({nodeID: nodeID}, function(err, peer) {
          var messageToSave = new Rumor({
            nodeID: nodeID,
            messageID: peer.uuID,
            friendID: nodeID,
            text: messageText,
            orderID: 0
          });
          console.log(JSON.stringify(messageToSave, 0, 4));
          messageToSave.save(function(err, result) {
            if(err) {
              console.log('Failed to save new message: ' + err.message);
            }
          });
        });
      }
  });
});

app.get('/rumors/all/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  var orderType = req.query.orderType;
  if(orderType == undefined || orderType == null) {
    Rumor.find({nodeID: nodeID, friendID: {$ne: nodeID}}).sort('messageID -orderID').exec(function(err, rumors){
      res.writeHead(200, { 'Content-Type': 'application/json'});
      res.write(JSON.stringify(rumors, 0, 4));
      res.end();
    });  
  } else {
    Rumor.find({nodeID: nodeID, friendID: {$ne: nodeID}}).sort('messageID orderID').exec(function(err, rumors){
      res.writeHead(200, { 'Content-Type': 'application/json'});
      res.write(JSON.stringify(rumors, 0, 4));
      res.end();
    });
  }
  
});

app.get('/rumors/rest/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  var messageID = req.query.messageID;
  var orderID = req.query.orderID;
  Rumor.find({nodeID: nodeID, messageID: messageID, orderID: {$gt: orderID}}).sort('-orderID').exec(function(err, rumors){
    res.writeHead(200, { 'Content-Type': 'application/json'});
    res.write(JSON.stringify(rumors, 0, 4));
    res.end();
  });
});

app.get('/rumors/ids/:nodeID', function(req, res){
  var nodeID = req.params.nodeID;
  var friendID = req.query.friendID;
  var ids = new Array(nodeID, friendID);
  Rumor.aggregate([{'$match': {'nodeID': nodeID, 'friendID': {'$nin': ids}}},{'$group': {'_id': '$messageID', 'orderID': {'$max': '$orderID'}}}]).exec(function(err, rumors){
    console.log(rumors);
    res.writeHead(200, { 'Content-Type': 'application/json'});
    res.write(JSON.stringify(rumors, 0, 4));
    res.end();
    /*if(err) {
      console.log('Sent Message update failed: ' +  err.message);
      res.status(500).send("Internal Server Error");
    } else {
      res.status(200).send("success");
    }*/
  });
});

app.get('/testdata', function(req, res){
  var rumor = new Rumor({
    nodeID: 'brady',
    friendID: 'brady',
    messageID: "e01f0fd0-c538-11e4-9782-4fbf867baba7",
    text: 'My first rumor',
    orderID: 1
  });
  rumor.save();
  var rumor2 = new Rumor({
    nodeID: 'joannie',
    friendID: 'joannie',
    messageID: '37fcae90-c536-11e4-8a91-7f41bf2839f9',
    text: 'joannies first rumor',
    orderID: 1
  });
  rumor2.save();
  var rumor3 = new Rumor({
    nodeID: 'joannie',
    friendID: 'joannie',
    messageID: '37fcae90-c536-11e4-8a91-7f41bf2839f9',
    text: 'joannies second rumor',
    orderID: 2
  });
  rumor3.save();
  var rumor4 = new Rumor({
    nodeID: 'brady',
    friendID: 'joannie',
    messageID: '37fcae90-c536-11e4-8a91-7f41bf2839f9',
    text: 'joannies first rumor',
    orderID: 1
  });
  rumor4.save();
  var sentMessage = new SentMessage({
    nodeID: 'joannie',
    friendID: 'brady',
    messageID: '37fcae90-c536-11e4-8a91-7f41bf2839f9',
    lastOrderID: 1
  });
  sentMessage.save();
  var relation1 = new Relation({
    nodeID: 'brady',
    friendID: 'joannie'
  });
  relation1.save();
  var relation2 = new Relation({
    nodeID: 'joannie',
    friendID: 'brady'
  });
  relation2.save();
});



app.listen(3000, function () {
  console.log('Server listening on', 3000);
});

/*function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/home')
}*/

function startNodeProcess(nodeID, uuID) {
  console.log("Starting new node: " + nodeID + "-" + uuID);
  global.processes[nodeID] = require('child_process').spawn('python', ['script.py', nodeID, uuID]);

  global.processes[nodeID].on('close', function(code) {
    console.log('closing code: ' + nodeID);
    delete global.processes[nodeID];
  });
}

function saveRumor(req, res, nodeID) {
  /*{"Rumor" : 
      {"MessageID": "ABCD-1234-ABCD-1234-ABCD-1234:5" ,
                  "Originator": "Phil",
                  "Text": "Hello World!"
                  },
      "EndPoint": "https://example.com/gossip/13244"
    }*/
  if(global.processes && global.processes[nodeID]) {
    var rumor = req.body;
    var uuID = rumor.Rumor.MessageID.split(":");
    Relation.find({nodeID: nodeID, friendID: rumor.Rumor.Originator}, function(err, result) {
      if(err) {
        res.status(500).send("Internal server error");
        return;
      }
      if(!result || result.length == 0) {
        var newRelation = new Relation({
          nodeID: nodeID,
          friendID: rumor.Rumor.Originator
        });
        newRelation.save();
      }
    });
    Peer.find({nodeID: rumor.Rumor.Originator}, function(err, result){
      if(!result.length) {
        var newPeer = new Peer({
          nodeID: rumor.Rumor.Originator,
          uuID: uuID[0],
          url: rumor.EndPoint
        });
        newPeer.save(function(err, result) {
          console.log("saved foreign peer");
          if(err) {
            res.status(500).send("Internal server error");
            return;
          }
        });
      }
    });
    var newRumor = {
      nodeID: nodeID,
      messageID: uuID[0],
      friendID: rumor.Rumor.Originator,
      text: rumor.Rumor.Text,
      orderID: uuID[1]
    }
    Rumor.update({nodeID: nodeID, messageID: uuID[0], orderID: uuID[1]}, newRumor, {upsert: true}, function(err, result) {
      console.log("finished insert of rumor for: " + nodeID);
      if(err) {
        res.status(500).send("Internal server error");
      } else {
        res.status(200).send("Success");
      }
    });
  } else {
    console.log(nodeID + " is not accepting messages.  Try again later.");
    res.status(404).send(nodeID + ' is not accepting messages.  Try again later.');
    res.end();
  } 
}

function handleWant(req, res, nodeID) {
  /*{"Want": {"ABCD-1234-ABCD-1234-ABCD-125A": 3,
              "ABCD-1234-ABCD-1234-ABCD-129B": 5,
              "ABCD-1234-ABCD-1234-ABCD-123C": 10
             } ,
   "EndPoint": "https://example.com/gossip/asff3"
  }*/
  var want = req.body;
  console.log(JSON.stringify(want));
  Peer.findOne({url: want.EndPoint}, function(err, result) {
    if(result) {
      res.status(200).send('Peer found, processing wants');
      for(var messageID in want.Want) {
        Rumor.find({nodeID: nodeID, messageID: messageID, 
          orderID: {$gt: want.Want[messageID]}}, function(err, result){
            if(err) {
              console.log("Error getting wanted rumors");
            } else {
              console.log("Found wanted messages: " + JSON.stringify(result));
              result.forEach(function(rumor, index){
                var messageJson = {
                  Rumor: {
                    MessageID: rumor.messageID + ":" + rumor.orderID,
                    Originator: rumor.friendID,
                    Text: rumor.text
                  },
                  EndPoint: 'http://' + SERVER_IP + ":3000/gossip/" + nodeID
                };
                // Set the headers
                var headers = {'Content-Type': 'application/json'};
                peerURL = url_parser.parse(want.EndPoint);

                // Configure the request
                var options = {
                    host: peerURL.hostname,
                    port: peerURL.port,
                    path: peerURL.path,
                    method: 'POST',
                    headers: headers
                }

                // Start the request
                console.log("posting wanted message to: " + want.EndPoint);
                post_req = http.request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                      // Print out the response body
                      console.log("successfully sent rumor")
                    } else {
                      console.log("failed to send rumor");
                      console.log(JSON.stringify(error.message));
                    }
                });
                post_req.write(JSON.stringify(messageJson));
                post_req.end();
              });
            }
          });
      }
    } else {
      console.log("Can't find peer to request want");
      res.status(200).send("No new rumors found.");
    }
  });
  
}


//Foursquare.Checkins.getRecentCheckins(null, accessToken, function (error, data))
