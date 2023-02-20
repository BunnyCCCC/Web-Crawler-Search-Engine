/****************************************************************/
/* This is server side personal-router.js file                  */
/* which sets up the router of personal page data related       */
/* get requests.                                                */
/****************************************************************/

/*
Supported operations in our API:
	GET /search --> search for the key words in the personal data
	GET /<title> --> display the page data for specific id for the page
*/

//modules, require npm install
const elasticlunr = require("elasticlunr");
const mongoose = require("mongoose");
const ObjectId = require('mongoose').Types.ObjectId;
const Personal = require("../models/personal-schema");
const express = require('express');
const fsPromises = require('fs').promises;
let db = mongoose.connection;
let router = express.Router();



//routers
router.get("/search", (req, res) => { res.render("pages/searchpersonal"); });
router.get("/", queryParser, search,  viewSeachResult);
router.get("/:id", countWord,sendSinglePage);





//Load a page based on id parameter
router.param("id", function (req, res, next, value) {

	console.log("Finding page by ID: " + value);


	//find the page
	Personal.findOne({_id:value}, function (err, result) {
		if (err) {
			console.log(err);
			res.status(500).send("Error reading page.");
			return;
		}
		if (!result) {
			res.status(404).send("Page ID " + value + " does not exist.");
			return;
		} else {
			req.page = result;
			next();
		}

	});
});


//view search result
function viewSeachResult(req, res, next) {
	res.format({
		"application/json": function () { res.json(res.result); },
		"text/html": function () { res.render("pages/searchPersonalResult", { pages: res.result }); }
	});
}
//send a single products
function sendSinglePage(req, res, next) {
	res.format({
		"application/json": function () {
			res.status(200).json(req.page);
		},
		"text/html": () => {
			res.render("pages/personalpage", { page: req.page, title: req.page.title, pid: req.page.p_id, content:req.page.content, contentCount:req.page.contentCount, outgoing:req.page.outgoing, incoming:req.page.incoming, freq:req.page.incoming.length});
		}
	});

	next();
}


//parse the query
function queryParser(req,res,next){
	//parse the query that entered in the field
	if (!req.query.q) {
		req.query.q = "?";
		res.redirect("http://localhost:3000/personal/search");
		return;
	}
	console.log(req.query);

	next();
}



//search the personal database based on the content score and/or the pagerank
async function search(req,res,next){
	let indexDump = await fsPromises.readFile('./personal_index.json').catch((err) => console.error('Failed to read file', err));
	let index = await elasticlunr.Index.load(JSON.parse(indexDump));
	let pages = await Personal.find({});
	let searchResult;
	//let noPageRankResult;
	searchResult  = index.search(req.query.q, {
		fields: {
				title: {boost: 3},
				content: {boost: 2},
				uri: {boost: 1},
		},
		bool: "OR",
		expand: true
	});
	console.log("search result is");
	console.log(searchResult);
	let result = [];

	if(searchResult.length == 0){
		res.status(200).send("No search result found");
		return;
	}else{

		if(req.query.boost==="true"){
			//if client request with page rank boost
			let allResult = [];
			let l = searchResult.length;
			for(let j=0;j<l;j++){
				let d = index.documentStore.getDoc(searchResult[j].ref);
				let p = await Personal.findById(d._id);
				//score is calculated as the content score * the page_rank
				d.score = searchResult[j].score * p.page_rank;
				allResult.push(d);
			}
			allResult.sort((a, b) => b.score - a.score);
			let length = allResult.length >= req.query.limit? req.query.limit : allResult.length;
			for(let k=0; k<length; k++){
				let doc = allResult[k];
				result.push(doc);
			}
		}else{
			//if client request without page rank boost
			let len = searchResult.length >= req.query.limit? req.query.limit : searchResult.length;
			console.log(len);
			for (let i = 0; i < len; i++){
				let doc = index.documentStore.getDoc(searchResult[i].ref);
				doc.score = searchResult[i].score;
				result.push(doc);
			}
		}

	res.result = result;
	//inplementation of return result
	next();
	}
}


//helper function to count the word
function countWord(req,res,next){

	var contentCount = {}
	let content = req.page.content;
	//skip all the special character count
	content = content.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ' ').split(' ').filter(item => item!='');
	//console.log(content);
	for(let item of content){
		contentCount[item] = contentCount[item] ? contentCount[item] + 1: 1;
	}
	req.page.contentCount = contentCount;
	next();

}


//Export the router object to mounted in the server.js
module.exports = router;
