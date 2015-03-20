var db = require("../db");
var SentMessage = db.model('SentMessage', {
	nodeID: String,
	friendID: String,
	messageID: String,
	lastOrderID: Number
})
module.exports = SentMessage;