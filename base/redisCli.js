var config = require('../config');
var port = config.redis.port;
var host = config.redis.host;

var redis = require("redis"),
client = redis.createClient(port,host);

client.on("error", function (err) {
    console.log("Error " + err);
});

module.exports= client;