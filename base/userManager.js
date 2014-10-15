var redisCli = require('./redisCli')
	,redisKey = require('./redisKey')
	,_ = require('underscore')
	;

// user 对象
var user = {
	id:'',	
	pid:'',	//第三方id "1"表示微信 "2"表示支付宝
	pUserID:'',// 第三方平台用户ID	
	pUserName:'',// 第三方平台用户名称
	userName:'',	//用户名
	thumbUrl:'',
	timestamp:'',
	addressID:''	//默认收货地址ID
}

var userKey = redisKey.user	
	,userCount = redisKey.userCount
	;

module.exports = {
	//判断用户是否存在
	isExistUser : function(uid,callback){	
		if(uid){
			redisCli.hexists(userKey,uid,function(err,replies){
				if(replies){
					callback(null,true);
				}else{
					callback(null,false)
				}
			})
		}else{
			callback('userID不能为空');
		}
	},
	//创建用户
	createUser : function  (obj,callback) {
		if(obj&&!_.isEmpty(obj)){

			var field = redisKey.getUserField(obj.pid,obj.pUserID)
				;
			_.map(obj,function(val,key){
				user[key] = val;
			})
			user.id = field;
			user.timestamp = new Date().valueOf();
			redisCli.hset(userKey,field,JSON.stringify(user),function(err,replies){
				if(err){
					callback(err);
				}else{
					callback(null,user);
				}
			})
		


		}else{
			callback('用户数据不能为空')
		}
	},
	// 根据id获取用户信息
	getUser : function(uid,callback){
		getUserInfo(uid,callback);
	},
	// 设置默认收货地址
	setDefaultAddress: function(uid,aid,callback){
		if(uid&&aid){
			getUserInfo(uid,function(err,replies){
				if(err||!replies){
					callback(err)
				}else{
					var user = JSON.parse(replies);
					user.addressID = aid;
					redisCli.hset(userKey,uid,JSON.stringify(user),function(err,replies){
						if(err){
							callback(err)
						}else{
							callback(null,replies)
						}
					})
				}
			});
		}else{
			callback('用户ID和地址ID不能为空')
		}
	}
}

var getUserInfo = function(uid,callback){
	if(uid){
		redisCli.hget(userKey,uid,function(err,replies){
			if(err){
				callback(err);
			}else{
				callback(null,replies);
			}
		});
	}else{
		callback('uid不能为空');
	}
}