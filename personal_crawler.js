
/************************************************************************/
/* This is the crawler for personal page data for website carleton.ca   */
/* This required to be run before running the personal_pagerank.js      */
/* Some website with non-html or non-https has been removed from result */
/* After crawler finished, the update process starts and please allow   */
/* it to finish with incoming links and adding pid for each page.       */
/* The program is completed finished when queue size =1                 */
/************************************************************************/


//Required module (install via NPM)
const Crawler = require("crawler");
const mongoose  = require("mongoose");
const Deque = require("double-ended-queue");
const URI = require('uri-js');
const validUrl = require('valid-url');
const ObjectId = mongoose.Types.ObjectId;
const Personal = require("./models/personal-schema");




let db;
let dbCount = 0;
let freq = {};


mongoose.connect("mongodb://127.0.0.1:27017/crawledpages" ,async function(err, client) {
		if (err) {
			console.log("Error in connecting to database");
			console.log(err);
			return;
		}

		//Get the database and save it to a variable
		db = mongoose.connection;
		console.log("Connected to database");
		startCrawl();
});




const c = new Crawler({
	maxConnections: 5, //use this for parallel, rateLimit for individual
  //rateLimit: 10000,//make request every 10000ms = 10 senconds
	skipDuplicates:true,
  // This will be called for each crawled page

  callback: async function (error, res, done) {
	if (error) {
	  console.log(error);
		if(error.code == 'ETIMEDOUT' || error.code == 'ECONNRESET'){
			//if timeout requesting the current page or network gives up, call done();
			done();
		}
	} else {//start things
	  let pageLink = res.request.uri.href;
	  if(pageLink.charAt(pageLink.length - 1) === '/'){
		  pageLink = pageLink.slice(0,-1);
	  }

		//only crawl html
	  if(res.body.startsWith("<!doctype html>")){

			  let $ = res.$; //get cheerio data, see cheerio docs for info

				let title = $('title').text().trim()+" ";
			  title += $('h1').text();

			  title = title.replace(/\t/g, ' ');
			  title = title.replace(/\n/g, ' ');

			  let content = $('h2').text().trim()+ " ";
			  content += $("p").text().trim()+ " ";
			  content = content.replace(/\t/g, ' ');
			  content = content.replace(/\n/g, ' ');

				//generate outgoing links
			  let outgoing = [];
			  let outlinks = [];
			  let links = $("a"); //get all links from page
			  $(links).each(async function (i, link) {
				  let url = $(link).attr('href');
					let outurl;
					//only queue the valid url and https page
				  if(validUrl.isUri(url)&&url.startsWith("https")){
					  let host = URI.parse(url).host;
					  //console.log("URI:" + url + " host: " + host);
					  if(host){
						  let doamin = host.split('.');
						  if(doamin.includes('carleton')){

							  if(!outlinks.includes(url)){
									if(url.charAt(url.length - 1) === '/'){
									  url = url.slice(0,-1);

								  }

									outlinks.push(url);
							  }
							  let count = await Personal.countDocuments({});

							  if(count + c.queueSize <= 550){
									//check if the database count + current in the crawler queue
									//is less than 550
								  c.queue(url);
							  }
						  }
					  }

				  }
			});

			Personal.findOneAndUpdate(
				{uri: pageLink},
				{
					$set:{'outgoing': outlinks, 'title': title, 'content': content},
				},
				{new:true, upsert:true},(err,result)=>{
						if (err) {
							console.log(err.message);
						} else {
							dbCount++;
							console.log("This is the database counter-------------------> "+dbCount);
						}
					});

			console.log("queue size count" + c.queueSize);
	  }

	 done();
	}
  }

});


//Triggered when the queue becomes empty
c.on('drain', function () {//drain means queue is empty
	console.log("done");
	updateDatabase();
	updatePid();

});



//add the first uri in the queue
async function startCrawl(){
	c.queue({uri:'https://carleton.ca/'});
}

//generate sequential pid(start from 0)
async function getNextSequence(name){
	return await Counter.findOneAndUpdate(
		{id: "pageId"},
		{$inc: {personal_seq:1}},
	);

}


//reorganize Databasea
async function updateDatabase(){
	console.log("update page");
	//updated = false;
	let c = 0;
	let o = 0;
	let pages = await Personal.find({}).lean();
	let count = await Personal.countDocuments({});
	console.log("page length" + pages.length + "databse contain" + count);
	pages.forEach(async (p)=>{
		let out = p.outgoing;
		//let updateOut = [];
		for(let l of out){
			await updateInPage(p,l);
		}
		c++;
		if(c == count){
			console.log("update incoming page done");
		}

	});
}


//update incoming links after crawled all pages
async function updateInPage(p,l){
		return await Personal.findOneAndUpdate({uri:l},{$addToSet:{incoming:p.uri}},{new: true}).exec((err)=>{
			if (err) throw err;
		});
}


//update pid after crawled all pages
async function updatePid(){
		let seq = 0;
		let pages = await Personal.find({});
		pages.forEach((p, err) => {
			Personal.findOneAndUpdate({uri:p.uri},{pid:seq},{new:true}).exec((err)=>{
				if(err) throw err;
			});
			seq++;
		});
}
