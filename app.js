var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var passport = require('passport');
var util = require('util');
var FoursquareStrategy = require('passport-foursquare').Strategy;
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');
var serveStatic = require('serve-static');
var request = require('request');
var moment = require('moment');
var uuid = require('node-uuid');

var FOURSQUARE_CLIENT_ID = 'SCXYLTTM5GFH1F1EVSB2PCNADL0CV50Q45ACIJ2F0Q43USCD';
var FOURSQUARE_CLIENT_SECRET = 'MLTPJP1RE1TF0TYHOMOX3TU0BFLHDX23OUV4TZLXJIJWMEEE';

passport.serializeUser(function(user, done) {
  done(null, user._json.response.user.contact.email);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new FoursquareStrategy({
    clientID: FOURSQUARE_CLIENT_ID,
    clientSecret: FOURSQUARE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
	    // To keep the example simple, the user's Foursquare profile is returned
	    // to represent the logged-in user.  In a typical application, you would
	    // want to associate the Foursquare account with a user record in your
	    // database, and return that user instead.
	    /*console.log("Writing to db:" + req.body);
		var user = new User(
				{
					username: profile.username,
					token: profile.token
				}
		);
		user.save(function (err, post) {
	    	if (err) { return next(err) }
	    	console.log("Saved user");
	    	res.status(201).json(user);
	  	});*/
    	console.log("authenticated! "); // + JSON.stringify(profile, undefined, 2));
    	var userObject = profile._json.response.user;
    	var user = new User({
    		firstName: userObject.firstName,
    		lastName: userObject.lastName,
    		username: userObject.contact.email,
    		picturePrefix: userObject.photo.prefix,
    		pictureSuffix: userObject.photo.suffix,
    		location: userObject.homeCity,
    		lastLogIn: Date.now(),
        token: accessToken,
        uuid: uuid.v1()
    	});
    	var upsertUser = user.toObject();
    	delete upsertUser._id;
    	User.update({ username: profile._json.response.user.contact.email }, upsertUser, { upsert: true }, function(err, numberAffected, raw) {
    		if (err) { console.log("Error saving/updating user") }
	    	console.log("Saved user");
    	});
      	return done(null, profile);
    });
  }
));

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
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var User = require('./model/user');
var CheckIn = require('./model/checkin');

app.get('/', function(req, res) {
  res.redirect('/home');
});

app.get('/home', function(req,res) {
  var data = {};
  data.userAuthenticated = req.isAuthenticated();
	User.find(function(err, users) {
    data.users = users;
		res.render('home', {data: data});	
	});
	
});

app.get('/login', 
  passport.authenticate('foursquare'), 
  function (req,res){
  	console.log("shouldn't get here");
});

app.get('/auth', passport.authenticate('foursquare', { failureRedirect: '/home' }),
  function(req, res) {
  	//console.log("User: " + JSON.stringify(req.user, undefined, 2));
    res.redirect('/dashboard?user=' + req.user._json.response.user.contact.email);
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

app.get('/logout', function(req,res) {
	req.logout();
	res.redirect('/home');
});

app.get('/gossip/:userid', function(req, res) {
  console.log("gossip user= " + req.params.userid);
  require('crontab').load(function(err, crontab) {
    // create with string expression 
    var job = crontab.create('touch', 'a_new_file.txt');

    console.log(cronetab.jobs());
  });
  /*res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
  });*/
  
  /*{"Rumor" : 
    {"MessageID": "ABCD-1234-ABCD-1234-ABCD-1234:5" ,
                "Originator": "Phil",
                "Text": "Hello World!"
                },
    "EndPoint": "https://example.com/gossip/13244"
  }*/
  /*{"Want": {"ABCD-1234-ABCD-1234-ABCD-125A": 3,
              "ABCD-1234-ABCD-1234-ABCD-129B": 5,
              "ABCD-1234-ABCD-1234-ABCD-123C": 10
             } ,
     "EndPoint": "https://example.com/gossip/asff3"
    }*/
  //if rumor then store in database for that user
  //else if want then get all messages that we have
  // compare to messages from want and send back all messages they desire
  res.end();
});

app.listen(3000, function () {
  console.log('Server listening on', 3000);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/home')
}


//Foursquare.Checkins.getRecentCheckins(null, accessToken, function (error, data))
