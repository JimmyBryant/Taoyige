// require dependency modules
var redisCli = require('./redisCli')
	,redisKey = require('./redisKey')
	,productManager = require('./productManager')
	,_ = require('underscore')
	;

var cartKey = redisKey.cart;
var productKey = redisKey.product;

module.exports = {
	// 添加商品到购物车
	addtoCart: function(obj,callback) {
		if(obj&&obj.productID&&obj.userID){
			var id = obj.productID
				,userID = obj.userID
				,count = obj.count||1	// 商品数默认是1
				,price = obj.price
				,oriPrice = obj.oriPrice
				,freight = obj.freight
				;
			var cart = {
				productID:id,
				count:count,
				price:price,
				oriPrice:oriPrice,
				freight:freight,
				timestamp: Date.now()
			};
			// 保存商品信息到购物车
			redisCli.hset(cartKey,userID,JSON.stringify(cart),function(err,replies){
				if(err){
					callback(err)
				}else{
					callback(null,replies)
				}
			})

		}else{
			callback('无法添加空的商品信息到购物车')
		}
	},
	// 清空购物车
	emptyCart: function(uid,callback){
		if(uid){
			redisCli.hdel(cartKey,uid,function(err,replies){
				if(err){
					callback(err)
				}else{
					callback(null,replies)
				}
			})
		}else{
			callback('清空购物车失败')
		}
	},
	// 获取购物车商品
	getCart: function(uid,callback){
		getCart(uid,callback)
	}
}

var getCart = function(uid,callback){
	if(uid){
		redisCli.hget(cartKey,uid,function(err,replies){
			if(err){
				callback(err)
			}else{
				callback(null,replies)
			}				
		})
	}else{
		callback('获取购物车信息失败')
	}
}