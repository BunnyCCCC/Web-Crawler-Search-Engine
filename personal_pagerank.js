
/************************************************************************/
/* This is the pagerank calculator for personal page data               */
/* This required to be run after the personal crawler is finished       */
/* in order to get all the page rank result from the crawled data       */
/* under personals collection under A1.                                 */
/************************************************************************/


const mongoose  = require("mongoose");
const Page = require("./models/personal-schema");
const {Matrix} = require("ml-matrix");


let db;
let alpha = 0.1;
let MATRIX_SIZE;
let matrix;
let prob_matrix;
let PI;
let x0;
let rank = [];

//init function to create a matrix filled with zero
async function init(){
	MATRIX_SIZE = await Page.countDocuments({});
	matrix = Array(MATRIX_SIZE).fill(0).map(() => Array(MATRIX_SIZE).fill(0));
	PI = [Array(MATRIX_SIZE).fill(0)];
	PI[0][0] = 1;
	x0 = new Matrix(PI);
}

//connect to mongodb
mongoose.connect("mongodb://127.0.0.1:27017/A1", async function(err, client) {
		if (err) {
			console.log("Error in connecting to database");
			console.log(err);
			return;
		}

		//Get the database and save it to a variable
		db = mongoose.connection;
		console.log("Connected to database");
		init();
		populateMatrix();

});

//create the matrix database using count in the incoming and outgoing links
async function populateMatrix(){
	count = 0;
	let pages = await Page.find({}).lean();
	for (var p of pages){
		let i = p.pid;
		console.log("pid: " + i);

 		let outgoing = p.outgoing;
		for(var link of outgoing){
			await getPageId(link).then((result)=>{
				if(result){
					//console.log("result " + result.uri);
					let j = result.pid;
					if(result.pid==null){
						console.log(result);
					}else{
						//console.log(j);
						addPagelinks(i, j);
					}
				}
			});
		}
	}
	updateMatrix();

	//printMatrix();
}

//helper function to get page id via incoming/outgoing links
async function getPageId(link){
	return await Page.findOne({"uri": link}).lean();
}

//add page links counter to the matrix
function addPagelinks(i, j){
	matrix[i][j] = matrix[i][j] + 1;
}

//helper function to print the matrix, used in the unit testing
function printMatrix(){
	//for(let i = 0; i < matrix.length; i++){
		for(let j = 0; j < matrix[5].length; j++){
			process.stdout.write(matrix[5][j].toString());
			process.stdout.write(", ");
		}
		//console.log("page" + i + ": "+ count);
		process.stdout.write("\n");
	//}
}

//update the matrix entries to divide the count of the matrix row
function updateMatrix(){
	for(let i = 0; i < matrix.length; i++){
		count = 0;
		for(let j = 0; j < matrix[i].length; j++){
			count += matrix[i][j];
		}
		for(let j = 0; j < matrix[i].length; j++){
			if(matrix[i][j] != 0){
				matrix[i][j] = matrix[i][j] / count;
			}
		}
	}
	generateProbMatrix();
}

//generate probability matrix and multipling by alpha
function generateProbMatrix(){
	prob_matrix = new Matrix(matrix);
	let teleport_matrix = Matrix.ones(MATRIX_SIZE,MATRIX_SIZE);
	teleport_matrix = Matrix.div(teleport_matrix, MATRIX_SIZE);
	//console.log(teleport_matrix);
	prob_matrix = Matrix.add(Matrix.mul(prob_matrix, 1-alpha), Matrix.mul(teleport_matrix, alpha));
	//console.log(prob_matrix);
	computePageRank();
}

//recursive compute the distance to generate page rank
async function computePageRank(){
	while(true){
		let x1 = x0;
		x0 = x0.mmul(prob_matrix);
		let distance = computeEuclidean(x0,x1);
		if (distance < 0.0001 ){
			//console.log(x0.get(0,1));
			break;
		}
	}
	for(let i = 0; i < x0.columns; i++){
		let page = await getPageUri(i);
		if(page==null){
			continue;
		}else{
			let pageURI = page.uri;
			let p = {
				'uri': pageURI,
				'id': page._id,
				'score' : x0.get(0,i)
			}
			rank.push(p);
		}
	}
	sortRank();
	storePageRank();
}

//store the page rank in the personals collection under page_rank
async function storePageRank(){
	console.log("Store page rank in db");
	for(let i = 0; i < rank.length; i++){
		let r = await Page.findOneAndUpdate(
			{"_id": rank[i].id},
			{$set: {page_rank:rank[i].score}},
			{new:true}
		)
	}
	console.log("store page rank done");
}

//helper function to get the page uri based on page pid
async function getPageUri(pid){
	return await Page.findOne({"pid":pid}).lean();
}

//helper function to computer euclidean distance
function computeEuclidean(m1, m2){
	let sum = 0;
	for (let i = 0; i < m1.columns; i++){
		sum += Math.pow(m1.get(0, i)-m2.get(0, i),2);
	}
	return Math.sqrt(sum);
}

//sort function for the rank and print the top25 result in the console.
function sortRank(){
	rank.sort(function(a, b){
		return b.score - a.score;
	});

	for(let i = 0; i < 25; i++){
		let r = i+1;
		console.log("#" + r + "(" + rank[i].score.toFixed(10) + ") " +  rank[i].uri);
	}
	//console.log(rank);
}
