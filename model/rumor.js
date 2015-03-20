var db = require("../db");
var Rumor = db.model('Rumor', {
	nodeID: String,
	messageID: String,
	friendID: String,
	text: String,
	orderID: Number
})
module.exports = Rumor;