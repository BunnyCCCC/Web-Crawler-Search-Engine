
/*********************************************************************/
/* This is server side counter-schema.js file  		                   */
/* which sets up Schema of collection Counters in db crawledpages    */
/* this allows fruit pages to generate sequence as pid               */
/*********************************************************************/

const mongoose = require("mongoose");
const Schema = mongoose.Schema;



let CounterSchema = Schema({
	id:{
		type: String,
		unique:true
	},
	page_seq:{
		type:Number
	}

});





//export the module to allow server.js to create new page()
module.exports = mongoose.model("Counter", CounterSchema);
