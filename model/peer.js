var db = require('../db')
var Peer = db.model('Peer', {
	nodeID: String,
  	uuID: String,
  	url: String
})
module.exports = Peer