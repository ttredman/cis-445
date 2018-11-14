/*
    Tyler Redman
    CS 445: Advanced Database
    REST API Final Project
    
    API Paths:
      Get a review - GET /review/:reviewid
      Get random reviews by stars - GET /review/random/:n/:stars
      Get random reviews by date - GET /review/random/:n/:from_date/:to_date
      Add a review - POST /review/:reviewid
      Update a review - PUT /review/:reviewid
      Delete a review - DELETE /review/:reviewid
      
      Get an average of review stars over time - GET /review/:from/:to
      Get an average of helpful votes by product - GET /review/helpful/:prodid
      Get average review info for a customer by category - GET /review/info/:custid
*/
var http = require('http');
var path = require('path');

var express = require('express');
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://omega.unasec.info/amazon";

var router = express();
var server = http.createServer(router);

router.use(express.static(path.resolve(__dirname, 'client')));

MongoClient.connect(url,  { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("amazon");  
    var collection = dbo.collection('reviews');
    
  // Get a review
  router.get('/review/:reviewid', jsonParser, function (req, res) {          
  
      collection.aggregate(
        [
          { $limit: 100 }, 
          { $unwind: "$review" }, 
          { $match: {"review.id": `${req.params.reviewid}`} }
        ]).toArray(function(err, results) { 
        // callback arguments are err or an array of results
            if(!err) {
        
                console.log(results.length);
        
                for(var i = 0; i < results.length; i++) {
                  console.log(results[i]);
                }
        
                res.json(results);
            }
        
            else {
                res.send(err);
                db.close();
            }
          });
  });
  
  // Post a review
  router.post('/review', jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
  
    collection.insertOne(req.body, function(err, results) {
        if (err) throw err;
        res.json(results);
        db.close();
    });
  });  
  
  // Update a review
  router.put('/review/:reviewid', jsonParser, function (req, res) {
    var filter = { "review.id" : req.params.reviewid };
    var updates = { $set: req.body};
    
    collection.updateMany(filter, updates, {multi: false}, function(err, results) {
        if (err) throw err;
        res.send(results);
        db.close();
    });
  });
  
  // Delete a review
  router.delete('/review/:reviewid', jsonParser, function (req, res) {
    var myquery = { "review.id" : `${req.params.reviewid}` };
    
    collection.deleteMany(myquery, function(err, obj) {
      if (err) throw err;
      console.log("1 document deleted");
      db.close();
    });
  });

  // Get random reviews by stars
  router.get('/review/random/:n/:stars', function (req, res) {      

    var stars = parseInt(req.params.stars);
    var review_num = parseInt(req.params.n);

    collection.aggregate(
      [
        { $match: {"review.star_rating": stars } }, 
        { $sample: { size: review_num } }
      ]).toArray(function(err, results) { 
        if(!err) {
            res.json(results);
        }
        else {
            res.send(err);
            db.close();
        }
      });
  });
  
  // Get random reviews by date
  router.get('/review/random/:n/:from_date/:to_date', function (req, res) {      
 
        if (err) throw err;
        var from = new Date(req.params.from_date);
        var to = new Date(req.params.to_date);
        var review_num = parseInt(req.params.n);

        collection.aggregate(
          [
            { 
              $match: {
                        $and: [
                                { "review.date": {$gte : from} }, 
                                { "review.date": {$lte: to} }
                              ] 
                      }
            }, 
            { $sample: { size: review_num } }
          ]).toArray(function(err, results) { 
              if(!err) {
                  res.json(results);
              }
              else {
                  res.send(err);
                  db.close();
              }
            });
  });
  
  // average of helpful votes by product
  router.get('/review/helpful/:prodid', jsonParser, function (req, res) {          
    
        collection.aggregate(
          [ 
            { $limit : 1000000 }, 
            { $match : { "product.id" : `${req.params.prodid}` }}, 
            { 
              $group: 
                { 
                  _id: null, 
                  avgHelpfulVotes: { $avg : "$votes.helpful_votes" } 
                } 
              
            }
          ]).toArray(function(err, results) { 
          // callback arguments are err or an array of results
        if(!err) {
    
            console.log(results.length);
    
            for(var i = 0; i < results.length; i++) {
    
              console.log(results[i]);
            }
    
            res.json(results);
        }
    
        else {
            res.send(err);
            db.close();
        }
      });
  });
  
  // average of review stars over time
  router.get('/review/stars/:from/:to', jsonParser, function (req, res) {          

        var from = new Date(`${req.params.from}`);
        var to = new Date(`${req.params.to}`);
    
        collection.aggregate(
          [
            { $limit : 1000000 },
            {
                $match:
                    { "review.date" : { $gte : from, $lte : to } } 
            }, 
            { 
                $group: 
                { 
                    _id: null, 
                    avgStars: { $avg : "$review.star_rating" } 
                } 
            } 
          ]).toArray(function(err, results) { 
              // callback arguments are err or an array of results
              if(!err) {
                  console.log(results.length);
          
                  for(var i = 0; i < results.length; i++) {
                    console.log(results[i]);
                  }
          
                  res.json(results);
              }
          
              else {
                  res.send(err);
                  db.close();
              }
            });
  });
  
  //average review info for a customer by category
  router.get('/review/info/:custid', jsonParser, function (req, res) {          
        
    collection.aggregate(
      [
        /*{ $limit : 1000000 }, */
        {
            $match: { customer_id : `${req.params.custid}` } 
        }, 
        { 
            $group: 
            { 
                _id: "$product.category", 
                avgStars: { $avg : "$review.star_rating" }, 
                avgHelpfulVotes: { $avg : "$votes.helpful_votes" },
                avgTotalVotes: { $avg : "$votes.total_votes" }
            } 
        } 
    ]).toArray(function(err, results) { 
      // callback arguments are err or an array of results
      if(!err) {
          console.log("YEP");
  
          for(var i = 0; i < results.length; i++) {
            console.log(results[i]);
          }
  
          res.json(results);
      }
  
      else {
        res.send(err);
        db.close();
      }
    });
  });
  
  db.close();
});


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});


