var db = require("../db");
var CheckIn = db.model('CheckIn', {
	checkinId: String,
	user: String,
	shout: String,
	createdAt: Number,
	venue: {
		name: String,
		location: {
			formattedAddress: String
		}
	}
})
module.exports = CheckIn;