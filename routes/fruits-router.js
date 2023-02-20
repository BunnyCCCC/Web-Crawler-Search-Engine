/***************************************************************/
/* This is server side product-router.js file                  */
/* which sets up the router of fruits data related get request */
/***************************************************************/

/*
Supported operations in our API:
  GET /Top10 --> list top 10 popular fruits pages
	GET /search --> search for the key words in the fruits data
	GET /<title> --> display the page data for specific title

*/

//modules, use npm to install
const elasticlunr = require("elasticlunr");
const mongoose = require("mongoose");
const ObjectId = require('mongoose').Types.ObjectId;
const Page = require("../models/page-schema");
const express = require('express');
const fsPromises = require('fs').promises;
let db = mongoose.connection;
let router = express.Router();



//router for all get methods
router.get("/search", (req, res) => { res.render("pages/searchfruit"); });
router.get("/", queryParser, search,  viewSeachResult);
router.get("/Top10", loadTop10Pages, viewPages);
router.get("/:title", countWord,sendSinglePage);





//Load a page based on title parameter
router.param("title", function (req, res, next, value) {

	console.log("Finding page by Title: " + value);

	//find the page
	Page.findOne({title:value}, function (err, result) {
		if (err) {
			console.log(err);
			res.status(500).send("Error reading page.");
			return;
		}

		if (!result) {
			res.status(404).send("Page title " + value + " does not exist.");
			return;
		} else {
			//console.log("Result:");
			//console.log(result);
			req.page = result;
			next();

		}

	});
});



//loads the top 10 popular pages
//send back using viewPages
async function loadTop10Pages(req, res, next) {
	let p;
	try {
    p = await Page.find().sort({"frequency": -1}).limit(10).exec();
	} catch (err) {
   console.log(err)
	}
	res.popular = p;
 	//console.log(res.popular);
	next();
	return;

}


//view Top 10 popular pages
function viewPages(req, res, next) {
	res.format({
		"application/json": function () { res.json(res.popular); },
		"text/html": function () { res.render("pages/popular", { pages: res.popular }); }
	});
}

//view Top 10 search result
function viewSeachResult(req, res, next) {
	res.format({
		"application/json": function () { res.json(res.result); },
		"text/html": function () { res.render("pages/searchFruitResult", { pages: res.result }); }
	});
}
//send a single products
function sendSinglePage(req, res, next) {
	res.format({
		"application/json": function () {
			res.status(200).json(req.page);
		},
		"text/html": () => {
			res.render("pages/fruitpage", { page: req.page, title: req.page.title, pid: req.page.p_id, content:req.page.content, contentCount:req.page.contentCount, outgoing:req.page.outgoing, incoming:req.page.incoming, freq:req.page.incoming.length});
		}
	});

	next();
}

//parse the query
function queryParser(req,res,next){
	//parse the query that entered in the field
	if (!req.query.q) {
		req.query.q = "?";
		res.redirect("http://localhost:3000/fruits/search");
		return;
	}
	console.log(req.query);

	next();
}



//search the database based on the pagerank score or the content score
async function search(req,res,next){
	let indexDump = await fsPromises.readFile('./fruit_index.json').catch((err) => console.error('Failed to read file', err));
	let index = await elasticlunr.Index.load(JSON.parse(indexDump));
	let pages = await Page.find({});
	let searchResult;
	searchResult  = index.search(req.query.q, {
		fields: {
				title: {boost: 1},
				content: {boost: 2},
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
				let p = await Page.findById(d._id);
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


//helper function for word count
function countWord(req,res,next){

	var contentCount = {}
	let content = req.page['content'].split('\n').filter(item => item!='');
	//console.log(content);
	for(let item of content){
		contentCount[item] = contentCount[item] ? contentCount[item] + 1: 1;
	}
	//console.log(contentCount);
	req.page.contentCount = contentCount;

	for(let key in contentCount){
		console.log(key + ": " + contentCount[key]);
	}

	next();

}




//Export the router object to mounted in the server.js
module.exports = router;
