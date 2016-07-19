/**
 * Created by harshadbankar on 19/07/16.
 */
var express = require('express');
var app = require('express')();
//Load the request module
var request = require('request');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var databaseName = 'cabiniot';

var db;
var MongoClient = require('mongodb').MongoClient;
var mongoURL = 'mongodb://localhost:27017/'+databaseName;
var sensor_collection = 'sensor_collection';
var tc = require("timezonecomplete");
// var red="#f10606",orange="#f3952d",yellow="#f9ea05",green="#0cd829",white="#f1f1f1";
var red="red",orange="orange",yellow="yellow",green="green",white="white";
MongoClient.connect(mongoURL, function (err, dbinstance) {

    console.log("Connected correctly to Mongo server");
    db = dbinstance;

    db.collections(function (err, collections) {
        console.log("Total collections : " + collections.length);

//      code to drop all the collections
        /*    collections.forEach(function (collValue) {
         var deleteFlag = collValue.drop();
         console.log(deleteFlag);
         });  */

    });
});

app.use(express.static('public'));
if(process.env) {
    console.log(JSON.stringify(process.env));
}
http.listen(process.env.OPENSHIFT_NODEJS_PORT || 8010, function () {
    if (!process.env.OPENSHIFT_NODEJS_PORT) {
        console.log('server listening on http://localhost:8010');
    }
    else {
        console.log('server listening on : %d',process.env.OPENSHIFT_NODEJS_PORT);
    }
});

io.on('connection', function (socket) {
    console.log('new user connected: '+socket.id);

    socket.emit('sensor_data', {});
});

app.post('/addSensor', function (req, res) {
    var buffer = [];
    req.on('data', function (chunk) {
        buffer.push(chunk);
    });

    var trueResponse =  { statusCode: 200,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            status: 'OK'
        }
    }

    var falseResponse =  { statusCode: 400,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            status: 'NO'
        }
    }
    req.on('end', function () {
        var payload = {};
        try {
            payload = JSON.parse(Buffer.concat(buffer).toString());
        } catch (e) {}

        if(payload.username !== '' && !isNaN(payload.floorNumber) && payload.sensorId !=='') {

            var currentSensorDb = db.collection(sensor_collection);
            currentSensorDb.find({ "sensorId": payload.sensorId }).toArray(function (err, allMsg) {

                if(allMsg.length==0) {
                    var tempDateTime = new Date();

                    db.collection(sensor_collection).insertOne({
                        "addedby":payload.username,
                        "sensorId": payload.sensorId,
                        "floorNumber": payload.floorNumber,
                        "addedOn": tempDateTime,
                        "lastMovement": tempDateTime
                    }, function(error, result) {
                        if(error) {
                            console.log('Error while adding data to sensor table. For sensor ID %s',payload.sensorId);
                            res.writeHead(falseResponse.statusCode, falseResponse.headers);
                            res.end(JSON.stringify({status:"Error in mongo DB"}));
                        }
                        else {
                            console.log('Sensor %s added successfully, on %s',payload.sensorId, tempDateTime);
                            res.writeHead(trueResponse.statusCode, trueResponse.headers);
                            res.end(JSON.stringify(trueResponse.body));
                        }
                    });
                }
                else{
                    console.log('%s sensor already present.',payload.sensorId);
                    res.writeHead(falseResponse.statusCode, falseResponse.headers);
                    res.end(JSON.stringify({status:"This sensor already present"}));
                }
            });
        }
        else {
            res.writeHead(falseResponse.statusCode, falseResponse.headers);
            res.end(JSON.stringify({status:"Invalid Request"}));
        }
    })
});

app.post('/login', function (req, res) {
    var buffer = [];

    var trueResponse =  { statusCode: 200,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            status: 'OK'
        }
    }

    var falseResponse =  { statusCode: 401,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            status: 'NO'
        }
    }

    req.on('data', function (chunk) {
        buffer.push(chunk);
    });

    req.on('end', function () {
        var payload = {};
        try {
            payload = JSON.parse(Buffer.concat(buffer).toString());
        } catch (e) {}

        if(payload.username == 'demo' && payload.password == 'demo') {
            console.log('User is valid');
            res.writeHead(trueResponse.statusCode, trueResponse.headers);
            res.end(JSON.stringify(trueResponse.body));
        }

        else {
            res.writeHead(falseResponse.statusCode, falseResponse.headers);
            res.end(JSON.stringify(falseResponse.body));
        }
    });
});

app.get('/getSensorStatus', function(req, res) {
    res.writeHead(200, {
        'content-type': 'application/json'
    });

    var currentSensorDb = db.collection(sensor_collection);
   
    currentSensorDb.aggregate([

        {$group : {_id : "$floorNumber",  sensorId: {$sum : 1}}},
        {$sort : { _id : 1 }}

        ]).toArray(function (err, allFloors) {
        console.log("all floors: "+JSON.stringify(allFloors));
        if(allFloors != undefined) {
            getAllSensorsData(allFloors);
        }
    });

    function getAllSensorsData(allFloors) {
        if(allFloors.length!=0) {
            var jsonToSend = [];
            for(var i=0;i<allFloors.length; i++) {
                var tempFloor = allFloors[i];
                console.log("temp floor : "+JSON.stringify(tempFloor));
                currentSensorDb.find({"floorNumber":tempFloor._id}).toArray(function (err, allSensors) {
                    if(allSensors.length!=0) {
                        var tempJson = {},floorJSON={}, tempGreen=[],tempRed=[],tempOrange=[],tempYellow=[],tempWhite=[];
                        var tempFloorNumber;
                        for(var j=0; j < allSensors.length; j++) {
                            var temp = allSensors[j];
                            tempFloorNumber = temp.floorNumber;
                            var currentTime = new Date().toJSON().slice(0,25);
                            var sensorLastMovementTime = (temp.lastMovement).toJSON().slice(0,25);
                            console.log("Last Movement %s for sensor %s",temp.lastMovement,temp.sensorId);
                            var start = new tc.DateTime(sensorLastMovementTime);
                            var end = new tc.DateTime(currentTime);

                            var duration = end.diff(start);  // unit-aware duration
                            var minutes = duration.minutes();

                            if(minutes <= 15) {
                                temp.color = red;
                                tempRed.push(temp);
                            }
                            else if(minutes >16 && minutes<=60) {
                                temp.color = orange;
                                tempOrange.push(temp);
                            }
                            else if(minutes >60 && minutes<=120) {
                                temp.color = yellow;
                                tempYellow.push(temp);
                            }
                            else if(minutes >120) {
                                temp.color = green;
                                tempGreen.push(temp);
                            }
                            else{
                                temp.color = white;
                                tempWhite.push(temp);
                            }
                        }
                        tempJson.green = tempGreen;
                        tempJson.red = tempRed;
                        tempJson.orange = tempOrange;
                        tempJson.yellow = tempYellow;
                        tempJson.white = tempWhite;
                       // console.log('temp json: '+JSON.stringify(tempJson));
                       // console.log("temp floor id"+tempFloor._id);
                        floorJSON[tempFloorNumber] = tempJson;
                       // console.log('floorjson json: '+JSON.stringify(floorJSON));
                        jsonToSend.push(tempJson);
                       //console.log('jsonToSend json: '+JSON.stringify(jsonToSend));

                       if(jsonToSend.length === allFloors.length){
                                    console.log('Sensor data sent successfully \n %s',JSON.stringify(jsonToSend));
                                    res.end(JSON.stringify(jsonToSend));         
                       }  
                    }

                });

            }
                 
        }
        else{
            console.log('Error occured while sending sensor data');
            res.end(JSON.stringify({status:"no sensor data found"}));
        }
    }
});
app.post('/updateMovement', function (req, res) {
    var buffer = [];

    var trueResponse =  { statusCode: 200,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            status: 'OK'
        }
    }

    var falseResponse =  { statusCode: 401,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            status: 'NO'
        }
    }

    req.on('data', function (chunk) {
        buffer.push(chunk);
    });

    req.on('end', function () {
        var payload = {};
        try {
            payload = JSON.parse(Buffer.concat(buffer).toString());
        } catch (e) {}

        if(payload.sensorId !== '') {
            var tempDateTime = new Date();
            db.collection(sensor_collection).updateOne(
                { "sensorId" : payload.sensorId },
                {
                    $set: { "lastMovement":  tempDateTime}
                }, function(err, results) {
                    if(err) {
                        console.log("Error occured while updating sensor %d's data",payload.sensorId);
                        res.writeHead(falseResponse.statusCode, falseResponse.headers);
                        res.end(JSON.stringify({status:"Error occured while updating sensor data"}));
                    }
                    else if(results){
                        console.log("Movement date time updated for sensor %s, %s",payload.sensorId, tempDateTime);
                        res.writeHead(trueResponse.statusCode, trueResponse.headers);
                        res.end(JSON.stringify(trueResponse.body));
                    }
                });
        }
        else{
            res.writeHead(falseResponse.statusCode, falseResponse.headers);
            res.end(JSON.stringify({status:"Invalid request"}));
        }
    });
});



function getTodaysDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    return mm + '/' + dd + '/' + yyyy;
};

function getCurrentTime() {
    var d = new Date(); // for now
    var hrs = (d.getHours() < 10 ? '0' : '') + d.getHours(); // => 9
    var min = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); // =>  30
    var sec = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();

    return hrs + ":" + min + ":" + sec;
};