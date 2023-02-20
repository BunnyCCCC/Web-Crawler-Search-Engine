
/***********************************************************/
/* This is server side page-schema.js file  		           */
/* which sets up Schema of collection personals in db A1   */
/***********************************************************/

const mongoose = require("mongoose");
const Schema = mongoose.Schema;



let PersonalSchema = Schema({
	pid:{
		type: Number
	},
	title:{
		type: String
	},
	uri:{
		type: String
	},
	content: {
		type: String,
	},
	outgoing:[String],
	incoming:[String],
	frequency:{
		type: Number
	},
	page_rank:{
		type:Number
	}
});





//export the module to allow server.js to create new page()
module.exports = mongoose.model("Personal", PersonalSchema);
