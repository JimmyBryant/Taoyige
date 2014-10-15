
var redisCli = require('./redisCli');

store = {
	set:function (sid,session,callback) {
		redisCli.hset(sid,session,function(){
			callback()
		})
	}
}