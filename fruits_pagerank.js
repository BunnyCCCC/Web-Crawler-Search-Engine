
/************************************************************************/
/* This is the pagerank calculator for fruits page data                 */
/* There is no need to run it seperately since it's been export as      */
/* a module and will be called in the fruit-crawler.js after the        */
/* crawling process has been finished.                                  */
/************************************************************************/

const mongoose  = require("mongoose");
const Page = require("./models/page-schema");
const {Matrix} = require("ml-matrix");


//init function to create a matrix with size of 1000 filled with zero
let alpha = 0.1;
const MATRIX_SIZE = 1000;
let matrix = Array(MATRIX_SIZE).fill(0).map(() => Array(MATRIX_SIZE).fill(0));
let prob_matrix;
let PI = [Array(MATRIX_SIZE).fill(0)];
PI[0][0] = 1;
let x0 = new Matrix(PI);
let rank = [];



//create the matrix database using count in the incoming and outgoing links
async function populateMatrix(){
	count = 0;
	let pages = await Page.find({}).lean();
	for (var p of pages){
		let i = p.pid;
		let outgoing = p.outgoing;
		//console.log("page" + i + ": out " + outgoing.length + "------------->" + "count: " + count++);
		for(var link of outgoing){
			//console.log("the link is =============>"+link);
			await getPageId(link).then((result, err)=>{
				if (err) throw err;
				let j = result.pid;
				addPagelinks(i, j);
			})
		}
	}
	updateMatrix();

	//printMatrix();
}

//helper function to get page id via incoming/outgoing links
async function getPageId(title){
	return await Page.findOne({"title": title}).lean();
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
		let page = await getPageTitle(i);
		let pageName = page.title;
		let p = {
			'title': pageName,
			'score' : x0.get(0,i)
		}
		rank.push(p);
	}
	sortRank();
	storePageRank();
}

//store the page rank in the personals collection under page_rank
async function storePageRank(){
	console.log("Store page rank in db");
	for(let i = 0; i < rank.length; i++){
		let r = await Page.findOneAndUpdate(
			{title: rank[i].title},
			{$set: {page_rank:rank[i].score}},
			{new:true}
		)
		//console.log(r.page_rank);
	}
}

//helper function to get the page uri based on page pid
async function getPageTitle(pid){
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
		let link = 'https://people.scs.carleton.ca/~davidmckenney/fruitgraph/' + rank[i].title + '.html'
		let r = i+1;
		console.log("#" + r + "(" + rank[i].score.toFixed(10) + ") " +  link);
	}
	//console.log(rank);
}

//entry point for the fruit-crawler to start page rank calculation.
function startPageRank(){populateMatrix();}

//startPageRank();
module.exports = {startPageRank};
