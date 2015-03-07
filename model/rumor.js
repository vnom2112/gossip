var db = require("../db");
var Rumor = db.model('Rumor', {
	MessageID: String,
	Originator: String,
	Text: String
})
module.exports = Rumor;