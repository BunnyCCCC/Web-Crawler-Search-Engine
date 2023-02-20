/********************************/
/* This is server side js file  */
/********************************/

const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const mongoose  = require("mongoose");
const Page = require("./models/page-schema");
const Personal = require("./models/personal-schema");
const elasticlunr = require("elasticlunr");
const fs = require('fs');

let db;
let updated;
let indexed;



//set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


//Automatically parse JSON data
app.use(express.json());
//parse URL-encode payload
app.use(express.urlencoded({ extended: true }));
//preflight for CORS policy
app.use(cors());



//set fruits router and personal router
let fruitsRouter = require("./routes/fruits-router");
app.use("/fruits", fruitsRouter);
let personalRouter = require("./routes/personal-router");
app.use("/personal", personalRouter);



//get request for pages and background image
app.get('/images/*', (req, res, path) => { res.sendFile('./public/images/background.jpg', { root: __dirname }); });
app.get("/", (req, res, next) => { res.render("pages/index"); });






//Connect to database a4 which was initialized from database-initializer.js
mongoose.connect("mongodb://127.0.0.1:27017/A1", function(err, client) {
	if (err) {
		console.log("Error in connecting to database");
		console.log(err);
		return;
	}

	//Get the database and save it to a variable
	db = mongoose.connection;
	console.log("Connected to database");

	app.listen(3000);
	indexFruit();
	indexPersonal();

	console.log("Server listening on port 3000");
});

//function to index all the fruit pages and save to the fruit_index.json locally
async function indexFruit(){
	let all = await Page.find({}).lean();

	const index = elasticlunr(function () {
	  this.addField("title");
	  this.addField("content");
		this.addField('incoming');
		this.addField('outgoing');
	  this.setRef("_id");

	});

	for(let p of all){
		index.addDoc(p);
	}

	fs.writeFile('./fruit_index.json', JSON.stringify(index), function (err) {
    if (err) throw err;
    console.log('fruit index done');
  });
}

//function to index all the personal pages and save to the personal_index.json locally
async function indexPersonal(){
	let all = await Personal.find({}).lean();

	const index = elasticlunr(function () {
	  this.addField("title");
	  this.addField("content");
	  this.setRef("_id");

	});

	for(let p of all){
		index.addDoc(p);
	}

	fs.writeFile('./personal_index.json', JSON.stringify(index), function (err) {
    if (err) throw err;
    console.log('personal index done');
  });
}
