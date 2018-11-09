/*
    Tyler Redman
    CS 445: Advanced Database
    REST API Final Project
*/
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
const post_test = require('./test/test1.json');
const put_test = require('./test/test2.json');
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://omega.unasec.info/amazon";
//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

// TODO: get middleware body parser for Express

// Get a review
router.get('/review/:reviewid', jsonParser, function (req, res) {          

    MongoClient.connect(url,  { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("amazon");  
    var collection = dbo.collection('reviews');

    collection.aggregate([{$limit: 100}, {$unwind: "$review"}, {$match: {"review.id": `${req.params.reviewid}`}}]).toArray(function(err, results) { 
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
});

// Post a review
router.post('/review/:reviewid', function(req, res) {
  res.send(post_test);
});

// Update a review
router.put('/review/:reviewid', function(req, res) {
  res.send(put_test);
});

// Delete a review
router.delete('/review/:reviewid', jsonParser, function (req, res) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("amazon");  
      var collection = dbo.collection('reviews');
      var myquery = { "review.id" : `${req.params.reviewid}` };
      
      collection.deleteMany(myquery, function(err, obj) {
        if (err) throw err;
        console.log("1 document deleted");
        db.close();
      });
  });
});
/*
// Get random reviews by stars
router.get('/review/:n/:stars', function(req, res) {
  res.send("These are reviews with " + req.params.stars + " stars.");
});

// Get random reviews by date
router.get('/review/:n/:from_date/:to_date', function(req, res) {
  res.send("These are reviews from " + req.params.from_date + " to " + req.params.to_date);
});


router.get('/review/helpful/:prodid', jsonParser, function (req, res) {          

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("amazon");  
      var collection = dbo.collection('reviews');
  
      collection.aggregate([ 
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
});

router.get('/review/:from/:to', jsonParser, function (req, res) {          

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("amazon");  
      var collection = dbo.collection('reviews');
      var from = new Date(`${req.params.from}`);
      var to = new Date(`${req.params.to}`);
  
      collection.aggregate([
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
});
*/

router.get('/review/info/:custid', jsonParser, function (req, res) {          

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("amazon");  
      var collection = dbo.collection('reviews');
      
      collection.aggregate([
        /*{ $limit : 1000000 }, */
        {
            $match: { customer_id : `${req.params.custid}` } 
        }, 
        { 
            $group: 
            { 
                _id: null, 
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
});



server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});



