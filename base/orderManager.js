// require dependency modules
var redisCli = require('./redisCli')
	,redisKey = require('./redisKey')
	,productManager = require('./productManager')
	,productStatus = productManager.productStatus
	,addressManager = require('./addressManager')
	,_ = require('underscore')
	,CronJob = require('cron').CronJob
	;

// 订单状态
var orderStatus = {
	unpaid: 1,	//未付款
	paid:2,	//已付款
	delivered:3,	//已发货
	received:4,	//已收货
	closed:5,	//订单已关闭
	deleted:6,	//订单已删除
	refund:7,	//退款中 必须在已付款的状态下才能申请退款
	refundSuccess:8,	//退款成功
	returnGoods:9,	//退货中
	returnGoodsSuccess:10,	//已经收到到退货
	
	1:'等待付款',
	2:'已付款',
	3:'已发货',
	4:'已收货',
	5:'已关闭',
	6:'已删除',
	7:'退款中',
	8:'退款成功',
	9:'退货中',
	10:'收到到退货'
}

//订单对象
var order = {
	id:'',
	userID:'',
	productID:'',	//商品ID
	count:1,	//商品数量
	amount:'',	//订单总价=现价+运费
	totalPrice:'',	// 订单现价
	oriPrice:'',	//订单原价
	addressInfo:'',	//收货地址 {name:'',mobilephone:'',details:''}
	timer:20*60*1000,	//定时付款，否则订单关闭，默认20分钟
	expressCompany:'',	//快递公司ID
	expressNumber:'',	//快递单号
	customExpressInfo:[],	//自定义快递信息,[{context:'',time:''}]
	freight:0,	// 快递费用
	paymentPlatform:'2',	//支付平台 "1" 微信;"2" 支付宝
	paymentNotice:'',	//支付消息记录
	operation:[],	//[{desc:'',timestamp:''}]
	status:orderStatus.unpaid,	//初始状态为等待付款
	timestamp:''
}

var orderKey = redisKey.order
	,productKey = redisKey.product
	,addrssKey = redisKey.address
	,orderCountKey = redisKey.orderCount
	,productKey = redisKey.product
	,userKey = redisKey.user
	;
var parseTime = function(t,num){
	var num = num||2
		,t = t.toString()
		;
	for(;num>t.length;num--){
		t='0'+t;
	}
	return t;
}

module.exports = {
	orderStatus: orderStatus,
	createOrder : function  (obj,callback) {	//创建订单
		if(obj&&!_.isEmpty(obj)){
			var productID = obj.productID
				,count = parseInt(obj.count)
				,now = Date.now()
				,date = new Date(now)
				,arr = [date.getFullYear().toString().substring(2),parseTime(date.getMonth()+1),parseTime(date.getDate()),parseTime(date.getHours()),
					parseTime(date.getMinutes()),parseTime(date.getSeconds()),parseTime(date.getMilliseconds(),3),Math.floor(Math.random()*100)]
				;
			// 判断商品数量是否足够
			productManager.getProduct(productID,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies==null){
						callback('该商品不存在')
					}else{
						var product = JSON.parse(replies);
						// 商品是否正在销售
						if(product.status!=productStatus.onSale||product.saleStartTime>now||product.saleOffTime<now){
							res.send('商品未开发购买');
							return;
						}					
						if(product.count<count){	//商品数量不够
							callback('商品数量不够')
						}else{	// 创建订单
							var id = arr.join('');
							_.map(obj,function(val,key){
								order[key] = val;
							})
							order.id = id;
							order.timestamp = now;
							var small_order = {	// 方便查找用户订单
								id: id,
								productID: order.productID,
								timestamp: now,
								status: order.status 
							};
							var so = JSON.stringify(small_order);
							var multi = redisCli.multi();
							multi.hset(orderKey,id,JSON.stringify(order))
							.lpush(redisKey.getStatusOrderKey(order.status),order.id)
							.lpush(redisKey.getUserOrderKey(order.userID),so)
							.lpush(redisKey.getDateOrderKey(now),so)
							.exec(function(err,replies){
								if(err){
									callback(err)
								}else{
									//传递order id
									callback(null,id);
									//减少库存
									productManager.reduceStock(order.productID,count,function(err,replies){
										if(err){
											console.log('reduceStock error ',err)
										}else{											
											//创建cronjob，定时执行
											var job = new CronJob({
												cronTime: new Date(order.timestamp+order.timer),
												onTick:function(){
													//关闭订单并且恢复商品库存
													getOrder(id,function(err,replies){
														if(!err){
															var order = JSON.parse(replies);
															// 如果订单未支付
															if(order.status == orderStatus.unpaid){
																changeOrder(id,{status:orderStatus.closed},function(err,replies){
																	if(!err){
																		productManager.increaseStock(productID,count,function(err,replies){
																			if(replies){
																				console.log('订单已经关闭，库存恢复')
																			}
																		})
																	}
																})
															}
														}
													})
									
												},
												start:true
											})											
										}
									})									
								}
							});
						}
					}
				}
			})

		}else{
			callback('订单数据不能为空')
		}
	},
	// 获取某个用户的订单详细信息,包括商品信息
	getUserOrderDetails: function(id,uid,callback){
		if(id&&uid){
			getOrder(id,function(err,replies){
				if(err||!replies){	// 订单不存在
					callback(err)
				}else{
					var order = JSON.parse(replies);
					if(order.userID==uid){
						redisCli.hget(productKey,order.productID,function(err,replies){
							if(replies){
								order.product = JSON.parse(replies);
							}							
							callback(null,order)
						})						
					}else{
						callback('订单不存在')
					}
				}
			})
		}else{
			callback('无法获取订单')
		}
	},
	// 获取订单详细信息,包括商品信息
	// return Object
	getOrderDetails: function(id,callback){
		if(id){
			getOrder(id,function(err,replies){
				if(err||!replies){	// 订单不存在
					callback(err)
				}else{
					var order = JSON.parse(replies);
					redisCli.hget(productKey,order.productID,function(err,replies){
						if(replies){
							order.product = JSON.parse(replies);
						}							
						callback(null,order)
					})						
				}
			})
		}else{
			callback('无法获取订单')
		}
	},
	//是否存在未付款订单
	hasUnpaidOrder:function(uid,callback){
		if(uid){
			redisCli.lrange(redisKey.getUserOrderKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies.length){
						var unpaid = [];	//未付款的订单列表
						for(var i=0,len=replies.length;i<len;i++){
							var order = JSON.parse(replies[i]);
							if(order.status == orderStatus.unpaid){
								callback(null,true);
								return;
							}
						}
						callback(null,false)
					}else{
						callback(null,false)
					}
				}
			});
		}else{
			callback('用户ID不能为空')
		}
	},
	// 获取用户待支付订单
	// @params uid
	getUnpaidOrder: function(uid,callback){
		if(uid){
			redisCli.lrange(redisKey.getUserOrderKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies.length){
						var unpaid = [];	//未付款的订单列表
						_.each(replies,function(val){
							var order = JSON.parse(val);
							if(order.status == orderStatus.unpaid){
								unpaid.unshift(order.id);
							}
						});
						if(unpaid.length){
							// 获取订单详细信息
							redisCli.hmget(orderKey,unpaid,function(err,replies){
								if(err){
									callback(err)
								}else{
									var productIDArr = [];
									var result = [];
									replies.forEach(function(val){
										var order = JSON.parse(val);
										result.push(order);
										productIDArr.push(order.productID)
									});
									//获取商品信息
									redisCli.hmget(productKey,productIDArr,function(err,replies){
										if(err){
											callback(err)
										}else{
											result.forEach(function(order,i){
												order.product = JSON.parse(replies[i]);
											});
											// 对数组重排，按时间降序排列
											result = result.sort(function(a,b){
												return a.timestamp<b.timestamp
											})
											callback(null,result)
										}
									})								
								}
							});
						}else{
							callback(null,unpaid)
						}
					}else{
						callback(null,[]);		
					}
				}
			});
		}else{
			callback('用户ID不能为空')
		}
	},
	// 获取用户已经付款的订单
	// @params uid
	getPaidOrder: function(uid,callback){
		if(uid){
			redisCli.lrange(redisKey.getUserOrderKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies.length){
						var paid = [];	//未付款的订单列表
						_.each(replies,function(val){
							var order = JSON.parse(val);
							if(order.status == orderStatus.paid||order.status == orderStatus.delivered){
								paid.unshift(order.id);
							}
						});
						if(paid.length){
							// 获取订单详细信息
							redisCli.hmget(orderKey,paid,function(err,replies){
								if(err){
									callback(err)
								}else{
									var productIDArr = [];
									var result = [];
									replies.forEach(function(val){
										var order = JSON.parse(val);
										result.push(order);
										productIDArr.push(order.productID)
									});
									//获取商品信息
									redisCli.hmget(productKey,productIDArr,function(err,replies){
										if(err){
											callback(err)
										}else{										
											result.forEach(function(order,i){
												order.product = JSON.parse(replies[i]);
											});
											// 对数组重排，按时间降序排列
											result = result.sort(function(a,b){
												return a.timestamp<b.timestamp
											})
											callback(null,result)
										}
									})									
								}
							});
						}else{
							callback(null,paid);
						}
					}else{
						callback(null,[]);		
					}
				}
			});
		}else{
			callback('用户ID不能为空')
		}
	},
	// 获取已经完成的订单,包括已收货订单以及已关闭订单
	// @params uid:用户ID start:开始位置 count:订单数量
	getCompleteOrder: function(uid,start,count,callback){
		if(uid){
			var end = parseInt(start)+parseInt(count);
			// 获取用户全部订单
			redisCli.lrange(redisKey.getUserOrderKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies.length==0){
						callback(null,null)
					}else{						
						var complete = [];	//已经完成订单数组
						var uncomplete = [orderStatus.unpaid,orderStatus.paid,orderStatus.delivered];
						_.each(replies,function(val){
							var small_order = JSON.parse(val);							
							if(!_.contains(uncomplete,small_order.status)){
								complete.push(small_order.id);
							}
						});
						// 获取数组片段
						var chunk = complete.slice(start,end);
						if(chunk.length){
							// 获取订单详细信息
							redisCli.hmget(orderKey,chunk,function(err,replies){
								if(err){
									callback(err)
								}else{
									var productIDArr = [];
									var result = [];
									replies.forEach(function(val){
										var order = JSON.parse(val);
										result.push(order);
										productIDArr.push(order.productID)
									});
									//获取商品信息
									redisCli.hmget(productKey,productIDArr,function(err,replies){
										if(err){
											callback(err)
										}else{
											result.forEach(function(order,i){
												order.product = JSON.parse(replies[i]);
											});
											// 对数组重排，按时间降序排列
											result = result.sort(function(a,b){
												return a.timestamp<b.timestamp
											})
											callback(null,result)
										}
									})
								}
							});
						}else{
							callback(null,chunk)
						}
					}
				}
			})
		}else{
			callback('无法获取订单')
		}
	},
	// 获取未完成的订单
	getUncompleteOrder: function(uid,callback){
		if(uid){
			redisCli.lrange(redisKey.getUserOrderKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies.length==0){
						callback(null,null)
					}else{
						var uncomplete = [];	//未完成订单数组
						_.each(replies,function(val){
							var small_order = JSON.parse(val);
							if(small_order.status == orderStatus.paid||small_order.status == orderStatus.unpaid||small_order.status == orderStatus.delivered){
								uncomplete.unshift(small_order);
							}
						});
						callback(null,uncomplete)
					}
				}
			})
		}else{
			callback('无法获取订单')
		}
	},	
	// 根据订单状态获取订单 同时也会去获取订单的商品信息
	getOrderByStatus: function(status,start,count,callback){
		var end = parseInt(start)+parseInt(count)-1;
		if(status){
			redisCli.lrange(redisKey.getStatusOrderKey(status),start,end,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies.length){
						redisCli.hmget(orderKey,replies,function(err,replies){
							if(err){
								callback(err)
							}else{
								//遍历返回的订单数组，查找商品数据
								var orderlist = [];
								var productIDArr = [];
								var userIDArr = [];
								_.each(replies,function(val,i){
									if(val){
										var order = JSON.parse(val);
										orderlist.push(order);
										productIDArr.push(order.productID);
										userIDArr.push(order.userID);
									}
								})

								// 查找商品信息
								redisCli.hmget(productKey,productIDArr,function(err,replies){
									var products = replies;									
									// 查找用户信息
									redisCli.hmget(userKey,userIDArr,function(err,replies){
										var users = replies;
										if(products&&users){
											_.each(products,function(val,i){
												orderlist[i]['product'] = JSON.parse(products[i]);
												orderlist[i]['user'] = JSON.parse(users[i]);												
											})
											callback(null,orderlist);
										}
									})
								})

							}
						})
					}else{
						callback(null,[])
					}
				}
			})
		}else{
			callback('获取订单失败')
		}
	},
	// 获取某种状态下的订单数量
	lengthOfStatusOrder: function(status,callback){
		redisCli.llen(redisKey.getStatusOrderKey(status),function(err,replies){
			if(err){
				callback(err)
			}else{
				callback(null,replies);
			}
		})
	},
	getOrder: function(id,callback){
		getOrder(id,callback);
	},
	// 获取用户订单列表中和某个商品相关的订单
	getOrderByProductID: function(uid,pid,callback){
		if(uid&&pid){
			redisCli.lrange(redisKey.getUserOrderKey(uid),0,-1,function(err,replies){
				if(err){
					callback(err)
				}else{
					var orderlist = [];					
					_.each(replies,function(val){
						var so = JSON.parse(val)
							;
						// 找到商品相关的订单则返回
						if(so.productID==pid){
							orderlist.push(so);
						}
					})
					callback(null,orderlist)					
				}
			})
		}else{
			callback('无法获取订单')
		}
	},
	// 支付订单,并且增加商品销量
	payOrder: function(id,notice,callback){
		if(id){
			changeOrder(id,{status:orderStatus.paid,paymentNotice:notice},function(err,replies){
				if(err){
					callback(err)
				}else{
					var order = replies;
					//增加商品销量
					productManager.increaseSalesVolume(order.productID,order.count,function(err,replies){
						if(err){
							console.log('increaseSalesVolume error')
						}
					});
					callback(null,true)
				}
			});
		}else{
			callback('无法支付订单')
		}
	},
	// 订单设置为发货
	deliverOrder: function(id,expressObj,callback){
		if(id&&!_.isEmpty(expressObj)){
			var expressNumber = expressObj.expressNumber
				,expressCompany = expressObj.expressCompany
				,customExpressInfo = expressObj.customExpressInfo||[]
				;
			changeOrder(id,{status:orderStatus.delivered,expressNumber:expressNumber,expressCompany:expressCompany,customExpressInfo:customExpressInfo},callback);
		}else{
			callback('无法发货')
		}
	},
	// 设置快递信息
	setExpressInfo: function(id,expressObj,callback){
		if(id&&!_.isEmpty(expressObj)){
			var expressNumber = expressObj.expressNumber
				,expressCompany = expressObj.expressCompany
				,customExpressInfo = expressObj.customExpressInfo||[]
				;
			changeOrder(id,{expressNumber:expressNumber,expressCompany:expressCompany,customExpressInfo:customExpressInfo},callback);
		}else{
			callback('无法添加快递信息')
		}
	},
	// 设置订单金额
	setAmount: function(id,amount,callback){
		if(id){
			changeOrder(id,{amount:parseFloat(amount)},callback)
		}else{
			callback('订单不存在')
		}
	},
	// 设置订单为退款状态
	refund: function(id,callback){
		if(id){
			changeOrder(id,{status:orderStatus.refund},callback)
		}else{
			callback('订单不存在')
		}
	},
	// 设置订单为退款成功状态
	refundSuccess: function(id,callback){
		if(id){
			changeOrder(id,{status:orderStatus.refundSuccess},callback);
		}else{
			callback('订单不存在')
		}
	},
	// 设置订单已经收货
	checkOrder: function(id,callback){
		if(id){
			// 普通用户关闭订单得判断订单是不是他的
			if(arguments.length==3){
				var uid = arguments[1]
					,callback = arguments[2]
					;
				getOrder(id,function(err,replies){
					if(err){
						callback(err);
					}else{
						var order = JSON.parse(replies);
						// 订单属于该用户，验收订单
						if(order.userID==uid){
							check(callback);
						}else{
							callback('订单无法关闭')
						}
					}
				})
			}else{
				check(callback);
			}
		}else{
			callback('订单收货失败')
		}
		function check(callback){
			changeOrder(id,{status:orderStatus.received},function(err,replies){
				if(err){
					callback(err)
				}else{
					callback(null,replies)
				}			
			});				
		}
	},
	// 关闭订单
	closeOrder: function(id,callback){		
		if(id){
			// 普通用户关闭订单得判断订单是不是他的
			if(arguments.length==3){
				var uid = arguments[1]
					,callback = arguments[2]
					;
				getOrder(id,function(err,replies){
					if(err){
						callback(err);
					}else{
						var order = JSON.parse(replies);
						// 订单属于该用户
						if(order.userID==uid){
							close(callback);
						}else{
							callback('订单无法关闭')
						}
					}
				})
			}else{
				close(callback);
			}
	
		}else{
			callback('无法关闭订单')
		}
		function close(callback){
			changeOrder(id,{status:orderStatus.closed},function(err,replies){
				if(err){
					callback(err)
				}else{
					var order = replies;
					var count = order.count
						,pid = order.productID
						;
					// 订单关闭，增加商品库存
					productManager.increaseStock(pid,count,callback)
				}			
			});				
		}
	},
	// 自动关闭过期订单
	closeOutdatedOrder: function(id,callback){
		if(id){
			getOrder(id,function(err,replies){
				if(err){
					callback(err)
				}else{
					if(replies){
						var order = JSON.parse(replies)
							,count = order.count
							,pid = order.productID
							;
						//订单未过期
						if(order.timer+order.timestamp>Date.now()){
							callback(null,false)
						}else{
							//订单关闭，更新商品库存
							changeOrder(id,{status:orderStatus.closed},function(err,replies){
								if(err){
									callback(err)
								}else{
									// 更新商品库存
									productManager.increaseStock(pid,count,function(err,replies){
										if(err){
											console.log('increaseStock error')
										}
									})
									callback(err,replies)
								}			
							});	
						}
					}else{
						callback(null,false)
					}
				}
			})
		}else{
			callback('无法关闭订单')
		}
	},
	//	删除订单
	deleteOrder : function(id,pid,callback){		
		var count = 1;
		if(id&&pid){
			changeOrder(id,{status:orderStatus.deleted},function(err,replies){
				if(err){
					callback(err)
				}else{
					// 减少商品销售
					productManager.reduceSalesVolume(pid,count,callback)
				}			
			});			
		}else{
			callback('无法删除订单')
		}

	}
}

/**
*	获取订单信息
*/
var getOrder = function(id,callback){
	if(id){
		redisCli.hget(orderKey,id,function(err,replies){
			if(err){
				callback(err)
			}else{
				if(replies==null){
					callback('订单不存在')
				}else{
					callback(null,replies)
				}
			}
		})
	}else{
		callback('订单id未能为空')
	}
}
/**
* 修改订单状态
* @param id:订单id ;changedVal:修改后的对象;callback:回调函数
**/
var changeOrder = function(id,changedVal,callback){
	var forbidModify = ['id','timestamp','userID','productID'];
	if(id&&!_.isEmpty(changedVal)){
		getOrder(id,function(err,replies){
			if(err){
				callback(err)
			}else{
				var order = JSON.parse(replies)
					,small_order = null
					,ori_small_order = JSON.stringify({
								id: order.id,
								productID: order.productID,
								timestamp: order.timestamp,
								status: order.status
							})					
					,uid = order.userID
					,last_status = order.status //保存订单此刻的状态
					;
				for(var i in changedVal){
					var val = changedVal[i];
					//部分订单属性无法修改
					if(_.contains(forbidModify,i)){
						callback('无法修改订单');
						return;
					}else{						
						if(i=='status'){	// 如果有更新订单状态
							//订单已经是最新状态，返回order
							if(val==last_status){
								callback('订单已经是最新状态')
								return;
							}else if(order.status!=orderStatus.unpaid&&val==orderStatus.closed){	//判断订单是否未支付
								callback('订单无法更改为已关闭状态');
								return;	
							}else if(order.status!=orderStatus.unpaid&&val==orderStatus.paid){
								callback('订单无法更改为已支付状态')
								return;
							}else if((order.status!=orderStatus.paid&&order.status!=orderStatus.returnGoodsSuccess)&&val==orderStatus.refund){
								callback('订单无法更改为退款状态')
								return;
							}else if(order.status!=orderStatus.delivered&&val==orderStatus.received){
								callback('订单无法更改为已收货状态')
								return;
							}
							
							small_order = {
								id: order.id,
								productID: order.productID,
								timestamp: order.timestamp,
								status: val
							}
							// 记录订单状态变化
							order.operation.unshift({context:last_status+'-'+val,timestamp:Date.now()});
						
						}
						// 更新订单属性
						order[i] = val;
					}					
				}
				var multi = redisCli.multi();
				// 重新插入订单
				multi.hset(orderKey,id,JSON.stringify(order));
				if(small_order){	//如果需要更新订单状态
					small_order = JSON.stringify(small_order);
					multi.lrem(redisKey.getUserOrderKey(uid),0,ori_small_order)
						.lrem(redisKey.getDateOrderKey(order.timestamp),0,ori_small_order)
						.lrem(redisKey.getStatusOrderKey(last_status),0,order.id)
						.lpush(redisKey.getUserOrderKey(uid),small_order)
						.lpush(redisKey.getDateOrderKey(order.timestamp),small_order)
						.lpush(redisKey.getStatusOrderKey(order.status),order.id)
						;
				}
				multi.exec(function(err,replies){
					if(err){
						callback('订单修改失败')
					}else{
						callback(null,order)
					}
				});	
			}		
		})

	}else{
		callback('订单ID不能为空')
	}
}