/************************************************************************/
/* This is the crawler for fruit page data for the fruit website        */
/* This crawler will also run the fruits_pagerank.js automatically      */
/* after the crawling of data is finished.                              */
/* After crawler finished, the update process starts and please allow   */
/* it to finish with incoming links and adding pid for each page.       */
/* The program is completed when all the pageranks are shown in console.*/
/************************************************************************/


//Required module (install via NPM)
const Crawler = require("crawler");
const mongoose  = require("mongoose");
const Deque = require("double-ended-queue");
const Page = require("./models/page-schema");
const Counter = require("./models/counter-schema");
const PageRank = require("./fruits_pagerank");



let db;
let dbCount=0;
let freq = {};


mongoose.connect("mongodb://127.0.0.1:27017/crawledpages", async function(err, client) {
		if (err) {
			console.log("Error in connecting to database");
			console.log(err);
			return;
		}

		//Get the database and save it to a variable
		db = mongoose.connection;
		console.log("Connected to database");


		//prepare page Counter

		let c = new Counter();
		c.id = "pageId";
		c.page_seq = 0;
		c.save((err, result)=>{
			if(err) console.log(err);
			startCrawl();
		});
});




const c = new Crawler({
  maxConnections: 5, //use this for parallel, rateLimit for individual
  //rateLimit: 10000,//make request every 10000ms = 10 senconds
	skipDuplicates:true,
  // This will be called for each crawled page

  callback: async function (error, res, done) {
	if (error) {
	  console.log(error);
	} else {//starct things
	  let $ = res.$; //get cheerio data, see cheerio docs for info

	  let title = $("title");
	  let content = $("p").text();

	  let p = new Page();

	  let links = $("a"); //get all links from page
	  $(links).each(function (i, link) {
		p.outgoing.push($(link).text());

		//loop and find the exitsting page to add freq
		freq[$(link).text()] = freq[$(link).text()] ? freq[$(link).text()] + 1 : 1;
		c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/' + $(link).text() + '.html');
	  });

	  p.title = title.text();
	  p.content = content;

		//create the sequence id for the fruit page.
		await getNextSequence("pageId").then((result)=>{
		  p.pid = result.page_seq;
		  console.log("pid:"+p.pid);
	  });

		//save the page to the database
	  p.save(function (err, result) {
			if (err) {
				console.log(err.message);
			} else {
			  dbCount++;
			  console.log("This is the database counter-------------------> "+dbCount);
			}

		});

	  done();
	}
  }

});

//called when the crawler queue is empty
c.on('drain', function () {

		Object.keys(freq).forEach(function(key) {
						//assign frequency to PageSchema as well.
						Page.findOneAndUpdate({title: key}, {$set:{frequency:freq[key]}},{new: true}).exec(function(err,value){
							if(dbCount==1000){
								//update database with incoming link
								updateDatabase();
							}
					});
			});
});


//add the first uri to the crawler
function startCrawl(){
	//Queue a URL, which starts the crawl
	c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');
}

//generate sequential int id(start from 0)
async function getNextSequence(name){
	return await Counter.findOneAndUpdate(
		{id: "pageId"},
		{$inc: {page_seq:1}},
	);
}


//reorganize Databasea
async function updateDatabase(){
	updated = false;
	let c = 0;
	let pages = await Page.find({}).lean();
	pages.forEach((p)=>{
		let out = p.outgoing;
		out.forEach(async (l)=>{
			if(!updated){
				await updatePage(p,l);
				updated = false;
			}
		});
		c++;
		if(c == 1000){
			PageRank.startPageRank();
		}
	});
}

//update the incoming links for the page
async function updatePage(p,l){
		return await Page.findOneAndUpdate({title:l},{$addToSet:{incoming:p.title}},{new: true}).exec((err)=>{
			if (err) throw err;
		});
}
