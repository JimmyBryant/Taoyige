var redisCli = require('./redisCli')
	,redisKey = require('./redisKey')
	,userManager = require('./userManager')
	,_ = require('underscore')
	;

var address = {
	id : '',
	userID:'',
	name:'',	//收件人
	province:'',	//省
	city:'',	//市
	county:'',	//区县
	street:'',	//街道
	details:'',	//详细地址
	mobilephone:'',	//手机号码
	telephone:'',	//电话号码
	postcode:'',	//邮箱
	setDefault:false	//是否为默认地址
}

var addressKey = redisKey.address
	,userKey = redisKey.user
	,addressCountKey = redisKey.addressCount
	;

module.exports = {
	//添加地址
	addAddress : function  (obj,callback) {
		if(obj&&!_.isEmpty(obj)){
			redisCli.incr(addressCountKey,function(err,replies){
				if(err){
					callback(err);
				}else{
					var id = replies;
					_.map(obj,function(val,key){
						address[key] = val;
					})
					address.id = id;
					address.timestamp = Date.now();
					var multi = redisCli.multi();
					multi.hset(addressKey,id,JSON.stringify(address))
					.lpush(redisKey.getUserAddressKey(address.userID),id)
					.exec(function(err,replies){
						if(err){
							callback(err)
						}else{
							callback(null,address)
						}
					});
				}
			});
		}else{
			callback('地址数据不能为空')
		}	
	},
	//编辑地址
	editAddress:function(id,obj,callback){
		getAddressByID(id,function(err,replies){
			if(err){
				callback(err)
			}else{
				var addr = JSON.parse(replies);
				//id和userID不能修改
				obj.id = id;	
				obj.userID = addr.userID;
				//重新保存address
				redisCli.hset(addressKey,id,JSON.stringify(obj),function(err,replies){
					if(err){
						callback(err)
					}else{
						callback(null,replies)
					}
				});
			}

		});
	},
	//删除地址 仅仅删除user address list中的address id
	deleteAddress:function(id,uid,callback){
		if(id&&uid){
			redisCli.lrem(redisKey.getUserAddressKey(uid),0,id,function(err,replies){
				if(err){
					callback(err)
				}else{
					callback(null,replies)
				}
			});
		}else{
			callback('address id or user id err')
		}
	},
	//根据address id获取地址信息
	getAddress:function(id,callback){
		getAddressByID(id,callback);
	},
	// 获取用户最新的收货地址
	getDefaultAddress: function(uid,callback){
		if(uid){	
			redisCli.hget(userKey,uid,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(!replies){
						callback('用户不存在')
					}else{
						var user = JSON.parse(replies);
						if(user.addressID){ //设置了默认地址
							getAddressByID(user.addressID,callback);
						}else{	//否则选择最新创建的地址
							redisCli.lrange(redisKey.getUserAddressKey(uid),0,0,function(err,replies){
								if(err){
									callback(err)
								}else{
									if(replies.length){
										getAddressByID(replies[0],callback);
									}else{
										callback(null,null)
									}			
								}
							})	
						}
					}
				}
			})		

		}else{
			callback('用户ID不能为空')
		}
	},
	// 根据用户ID获取所有地址
	getAddressList:function(uid,callback){
		if(uid){
			// 获取user address set
			redisCli.lrange(redisKey.getUserAddressKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					var fieldList = replies;
					if(fieldList.length){
						redisCli.hmget(addressKey,fieldList,function(err,replies){
							if(err)
								callback(err)
							else 
								callback(null,replies)
						})						
					}else{
						callback(null,null)
					}

				}
			})
		}else{
			callback('用户ID不能为空')
		}
	}

}

function getAddressByID(id,callback){
	if(id){
		redisCli.hget(addressKey,id,function(err,replies){
			if(err){
				callback(err)
			}else{
				callback(null,replies)
			}
		})
	}else{
		callback('地址id不能为空')
	}
}