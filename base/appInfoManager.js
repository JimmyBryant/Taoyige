// require dependency modules
var redisCli = require('./redisCli')
	,redisKey = require('./redisKey')
	,_ = require('underscore')
	;

var key = redisKey.apps;

// 更新安卓应用信息
module.exports.updateAndroidAppInfo = function(obj,callback) {
	if(obj&&!_.isEmpty(obj)){
		var field = 'android';
		redisCli.hset(key,field,JSON.stringify(obj),function(err,replies){
			if(err){
				callback(err)
			}else{
				callback(null,replies)
			}
		})
	}
}
// 获取安卓应用信息
module.exports.getAndroidAppInfo = function(callback) {
	var field = 'android';
	redisCli.hget(key,field,function(err,replies){
		if(err){
			callback(err)
		}else if(!replies){
			callback(null,null)
		}else{
			callback(null,JSON.parse(replies));
		}
	})	
}