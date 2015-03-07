var db = require('../db')
var User = db.model('User', {
	username: 	{ type: String, required: true },
	firstName: 	{ type: String, required: true },
	lastName: 	{ type: String, required: true },
  	picturePrefix:    { type: String, required: false},
 	pictureSuffix:    { type: String, required: false},
  	location: 	{ type: String, required: false },
  	lastLogIn: 	{ type: Date, required: false, default: Date.now() },
  	token:      {type: String, required: true},
  	uuid: 		{type: String, required: true}
})
module.exports = User