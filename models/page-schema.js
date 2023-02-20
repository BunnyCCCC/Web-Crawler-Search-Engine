
/***********************************************************/
/* This is server side page-schema.js file for fruits 		 */
/* which sets up Schema of collection pages in db A1       */
/***********************************************************/

const mongoose = require("mongoose");
const Schema = mongoose.Schema;



let PageSchema = Schema({
	pid:{
		type: Number
	},
	title:{
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
	},
	uri:{
		type: String,
	}
});





//export the module to allow server.js to create new page()
module.exports = mongoose.model("Page", PageSchema);
