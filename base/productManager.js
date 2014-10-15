var redisCli = require('./redisCli')
	,redisKey = require('./redisKey')
	,_ = require('underscore')
	;
//商品对象
var product = {
	id:'',
	title:'',	//商品标题
	price:'',	//商品价格
	oriPrice:'',	//商品原价
	count:0,	//商品库存数量
	category:'',	//商品种类
	salesVolume: 0,	//商品销量，默认0
	description:'',	//商品描述
	largeImageUrl:[],
	normalImageUrl:[],
	thumbImageUrl:[],
	bannerUrl:'',	//首页展示的banner图片地址
	freight:0,	//商品运费，默认0
	timestamp:'',
	startType:1,	//商品发布类型 1 放入仓库 2 排期上架销售 3 立即上架销售	
	saleStartTime:'',	//商品开始销售时间
	saleOffTime:''	//商品下架时间
}

var productKey = redisKey.product
	,productCountKey = redisKey.productCount
	,saleKey = redisKey.productSale
	,readyKey = redisKey.productReady
	,storeKey = redisKey.productStore
	;
module.exports = {
	/* 
	*	添加商品
	* @param obj是商品对象 type 是商品开始类型 1=放入仓库 2=设置开始时间 3=立即开始
	*/
	addProduct : function  (obj,callback) {
		if(obj&&!_.isEmpty(obj)){
			redisCli.incr(productCountKey,function(err,replies){
				if(err){red
					callback(err)
				}else{
					var id = replies
						,type = obj.startType
						;
					_.map(product,function(val,key){
						if(obj[key]!=undefined)
							product[key] = obj[key];
					});
					product.id = id;
					product.timestamp = Date.now();
					var multi = redisCli.multi();
					
					if(type==1){	// 将商品放入仓库
						multi.rpush(storeKey,id);
					}else if(type==2){	//预定日期销售	
						var date = new Date(product.saleStartTime).getDate();
						multi.hset(readyKey,date,id)
					}else if(type==3){	//立即投放，重新设置onsale key的value
						// 获取正在销售的商品ID
						multi.get(saleKey);
						multi.set(saleKey,id);
					}
					multi.hset(productKey,id,JSON.stringify(product))
						.exec(function(err,replies){
							if(err){
								callback(err)
							}else{	
								// 将下架的商品放置到仓库中
								if(type==3&&replies[0]){
									redisCli.rpush(storeKey,replies[0],function(err,replies){
										callback(null,product.id)
									})
								}else{
									callback(null,product.id)
								}														
							}
						});
				}
			})
		}else{
			callback('商品数据不能为空')
		}
	},
	// 编辑商品
	editProduct : function(id,obj,callback){	
		if(id){
			redisCli.hget(productKey,id,function(err,replies){
				if(err){
					callback(err)
				}else{
					var product = JSON.parse(replies)
						,date = new Date(product.saleStartTime).getDate()
						,prev_type = product.startType
						,type = obj.startType
						;					
					_.map(obj,function(val,key){
						if(key!='id'&&key!='timestamp'){	//商品id和时间戳不能修改							
							product[key] = val;													
						}
					});
					var multi = redisCli.multi();
		
					if(prev_type==1){
						multi.lrem(storeKey,0,product.id)
					}if(prev_type==2){	//从排期队列中移除
						multi.hdel(readyKey,date);
					}else if(prev_type==3){
						multi.del(saleKey)
					}

					if(type==1){	// 将商品放入仓库
						multi.rpush(storeKey,id);
					}else if(type==2){	//排期销售	
						var new_date = new Date(product.saleStartTime).getDate();
						multi.hset(readyKey,new_date,id)
					}else if(type==3){	//立即投放，重新设置onsale key的value
						multi.set(saleKey,id);
					}
					
					multi.hset(productKey,id,JSON.stringify(product)).exec(function(err,replies){
						if(err){
							callback(err)
						}else{
							callback(null,product.id)
						}
					})
				}
			})
		}else{
			callback('商品ID不能为空')
		}
	},
	//增加商品库存
	increaseStock: function(id,count,callback){
		if(id){
			redisCli.hget(productKey,id,function(err,replies){
				if(err){
					callback(err)
				}else{
					var product = JSON.parse(replies);
					product.count+=parseInt(count);
					redisCli.hset(productKey,id,JSON.stringify(product),function(err,replies){
						if(err){
							callback(err)
						}else{
							callback(null,replies);
						}
					})					
				}
			})
		}else{
			callback('产品id不能为空')
		}
	},
	//减少商品库存
	reduceStock: function(id,count,callback){
		if(id){
			redisCli.hget(productKey,id,function(err,replies){
				if(err){
					callback(err)
				}else{
					var product = JSON.parse(replies);
					product.count-=parseInt(count);
					if(product.count<0){
						callback('商品库存不够')
					}else{
						redisCli.hset(productKey,id,JSON.stringify(product),function(err,replies){
							if(err){
								callback(err)
							}else{
								callback(null,replies);
							}
						})						
					}
				}
			})
		}else{
			callback('产品id不能为空')
		}
	},
	// 增加商品销售量
	increaseSalesVolume : function(id,count,callback){
		if(id){
			redisCli.hget(productKey,id,function(err,replies){
				if(err){
					callback(err)
				}else{
					var product = JSON.parse(replies);	
					product.salesVolume+=parseInt(count);
					redisCli.hset(productKey,id,JSON.stringify(product),function(err,replies){
						if(err){
							callback(err)
						}else{
							callback(null,replies);
						}
					})					
				}
			})
		}else{
			callback('产品id不能为空')
		}
	},
	// 减少商品销售量
	reduceSalesVolume:function(id,count,callback){
		if(id){
			redisCli.hget(productKey,id,function(err,replies){
				if(err){
					callback(err)
				}else{
					var product = JSON.parse(replies);
					product.salesVolume-=parseInt(count);
					if(product.salesVolume<0){	//商品销量不能为负数
						callback('销量不能小于0');
					}else{
						redisCli.hset(productKey,id,JSON.stringify(product),function(err,replies){
							if(err){
								callback(err)
							}else{
								callback(null,replies);
							}
						})
					}
				}
			})
		}else{
			callback('产品id不能为空')
		}
	},
	// 获取商品信息
	getProduct: function(id,callback){
		getProduct(id,callback);
	},
	//获取仓库中商品数量
	getStoreCount: function(callback){
		redisCli.llen(storeKey,function(err,replies){
			if(err){
				callback(err)
			}else{
				callback(null,replies)
			}
		})
	},
	// 获取ready sale keys
	getReadyKeys: function(callback){
		redisCli.hkeys(readyKey,function(err,replies){
			if(err){
				callback(err)
			}else{
				var readyArr = [];				
				_.each(replies,function(val){
					var date = new Date().getDate();
					if((parseInt(val)-date)>0){
						readyArr.push(parseInt(val)-date)
					}
				})
				callback(null,readyArr);
			}
		})
	},
	// 将商品从等待队列移除，放到仓库中
	removeReadyKey: function(id,callback){
		if(id){
			var multi = redisCli.multi();
			multi.hdel(readyKey,i).rpush(storeKey,id).exec(function(err,replies){
				if(err){
					callback(err)
				}else{
					callback(replies)
				}
			})
		}else{
			callback('need product id');
		}
	},
	// 获取当日销售的商品
	getTodayProduct: function(callback){
		redisCli.get(saleKey,function(err,replies){
			if(err){
				callback(err)
			}else{							
				if(replies){
					var id = replies;
					getProduct(id,function(err,replies){
						if(err){
							callback(err);
							return;
						}
						var product = JSON.parse(replies);
						// 如果商品销售时间未到期
						if(product.saleOffTime>Date.now()){
							callback(null,product);
						}else{	//商品销售时间到期
							//到期后将商品移动到仓库,并且清除sale,修改startType
							product.startType = 1;	//1表示放入仓库
							var multi = redisCli.multi();
							multi.rpush(storeKey,product.id)
							.del(saleKey)
							.hset(productKey,product.id,JSON.stringify(product))
							.exec(function(err,replies){
									if(err){
										callback(err)
									}else{
										getSaleFromReady(callback);
									}
								})
							
						}
					})
				}else{
					getSaleFromReady(callback)
				}
				//查找排期中是否有今天销售的商品
				function getSaleFromReady(callback){					
					redisCli.hkeys(readyKey,function(err,replies){
						if(err){
							callback(err)
						}else{
							var date = new Date().getDate().toString();	
							if(_.contains(replies,date)){
								redisCli.hget(readyKey,date,function(err,replies){
									if(err){
										callback(err)
									}else{
										var id = replies;
										var multi = redisCli.multi();
										multi.hdel(readyKey,date).set(saleKey,id).hget(productKey,id)
										.exec(function(err,replies){
											if(err){
												callback(err)
											}else{
												var product =  JSON.parse(replies[2]);
												product.startType = 3;	//商品类型修改为立即开始
												redisCli.hset(productCountKey,id,JSON.stringify(product),function(err,replies){
													if(err){
														console.log(err,'set product startType error')
													}
												})
												callback(null,product)
											}
										});
										
									}
								})
							}else{
								callback(null,null)
							}
						}
					})										
				}					
			}
		})
	}, 
	// 获取出售中的商品信息
	getProductOnSale: function(callback){
		redisCli.get(saleKey,function(err,replies){
			if(err){
				callback(err)
			}else{
				if(replies){
					var id = replies;
					redisCli.hget(productKey,id,function(err,replies){
						if(err){
							callback(err)
						}else{
							callback(null,replies)
						}
					})
				}else{
					callback(null,null)
				}
			}
		})
	},
	// 获取排期销售的商品
	getProductReadySale: function(callback){
		redisCli.hgetall(readyKey,function(err,replies){
			if(err){
				callback(err)
			}else if(!replies){
				callback(null,[])
			}else{
				var productIDArr = [];
				for(var i in replies){
					productIDArr.push(replies[i])
				}
				redisCli.hmget(productKey,productIDArr,function(err,replies){
					if(err){
						callback(err)
					}else{
						callback(null,replies)
					}
				});
			}
		})
	},
	/*
	* 获取仓库中的商品
	* @params s 开始  c 数量
	*/
	getProductStoring: function(s,c,callback){
		var start = s
			,end = start+c
			;
		redisCli.lrange(storeKey,start,end,function(err,replies){
			if(err){
				callback(err)
			}else{
				redisCli.hmget(productKey,replies,function(err,replies){
					if(err){
						callback(err)
					}else{
						callback(null,replies)
					}
				})
			}
		})
	}
}

var getProduct = function(id,callback){
	if(id){
		redisCli.hget(productKey,id,function(err,replies){
			if(err){
				callback(err)
			}else{
				callback(null,replies)
			}
		});
	}else{
		callback('商品ID不能为空')
	}
} 