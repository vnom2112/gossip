var db = require("../db");
var Relation = db.model('Relation', {
	nodeID: String,
	friendID: String
})
module.exports = Relation;