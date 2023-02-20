
/***************************************************/
/* This is the database-cleaner.js                 */
/* which clean all the collections under A1        */
/***************************************************/



let mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
let db;


//connected to mongo db
MongoClient.connect("mongodb://127.0.0.1:27017/", function(err, client) {
  if(err) throw err;

  db = client.db('A1');
  //if database is already been cleared
  db.listCollections().toArray(function(err, result){
	 if(result.length == 0){
		 console.log("Database is empty");
     client.close();
  }

	 let numDropped = 0;
	 let toDrop = result.length;
	 result.forEach(collection => {
		db.collection(collection.name).drop(function(err, delOK){
			if(err){
				throw err;
			}

			console.log("Dropped collection: " + collection.name);
			numDropped++;

			if(numDropped == toDrop){
				    console.log("Total number of collections dropped:  "+numDropped);
            client.close();
					}

				});
		});
	 });
  });
