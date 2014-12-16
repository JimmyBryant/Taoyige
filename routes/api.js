/*
* api.js 
* api for android app and ios app
*/

//module required
var _ = require('underscore')
	,userManager = require('../base/userManager')
	,productManager = require('../base/productManager')
	,productStatus = productManager.productStatus
	,orderManager = require('../base/orderManager')
	,orderStatus = orderManager.orderStatus
	,addressManager = require('../base/addressManager')
	,addressMap = require('../base/addressMap')
	,appInfoManager = require('../base/appInfoManager')
	,xto = require('xto')
	,crypto = require('../common/crypto')
	;

var method = '';

var responseData = function(type,mes){
	var data = {}
		,mes = mes||''
		,result = null
		;
	if(type==true){
		result = {
			"errorCode":200
		};
	}else if(type==false){
		result = {
			"errorCode":400,
		};
	}else if(type=='err'){
		result = {
			"errorCode":500
		}
		if(mes){
			result.errorMessage = mes;
		}
	}
	data.result = result;
	return data;
}	


var API = {
	// 用户API
	user:{
		// 通过ID获取用户信息
		info: function(req,res,next){
			var uid = req.query.uid;
			if(method=='get'){
				userManager.getUser(uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else if(replies){
						var user = JSON.parse(replies);
						// 旧数据使用profile_image_url
						// 现在全部使用thumbUrl替换
						if(user.profile_image_url){
							user.thumbUrl = user.profile_image_url;
						}
						res.send(_.extend(user,responseData(true)));
					}else{ //数据为空
						res.send(responseData(true))
					}
				});
			}else{
				next()
			}
		},
		create: function(req,res,next){
			if(method=='post'){
				var params = req.body
					;
				var user = {
					pid : params.pid,
					pUserID : params.pUserID,
					pUserName : params.pUserName,
					userName : params.userName,
					thumbUrl : params.thumbUrl||''
				}
				userManager.createUser(user,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else{
						res.send(_.extend(responseData(true),replies))
					}
				})
			}else{
				next();
			}
		}
	},
	// 商品API
	goods:{
		// 获取商品详细信息
		detail: function(req,res,next){
			if(method=='get'){
				var id = req.query.id
					,serverTime = Date.now()
					,goods = null
					;
				if(id){
					productManager.getProduct(id,function(err,replies){
						if(err){
							res.send(responseData('err',err))
						}else if(replies){
							goods = JSON.parse(replies);
							goods.serverTime = serverTime;
							res.send(_.extend(responseData(true),goods));
						}else{ //数据为空
							res.send(responseData(true))
						}
					});
				}else{
					productManager.getTodayProduct(function (err,replies){
						if(err){
							res.send(responseData('err',err))
						}else if(replies){
							goods = replies;
							goods.serverTime = serverTime;
							res.send(_.extend(responseData(true),goods))
						}else{ //数据为空
							res.send(responseData(true))
						}						
					});
				}
			}else{
				next();
			}
		},
		// 即将开始的商品
		commingsoon: function(req,res,next){
			if(method=='get'){
				productManager.getCommingSoon(function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else if(replies){
						var goods = JSON.parse(replies);
						res.send(_.extend(responseData(true),goods));
					}else{ //数据为空
						res.send(responseData(true))
					}
				})
			}else{
				next()
			}
		}
	},
	// 订单API
	order:{
		// 判断是否可以购买该商品
		checkPurchase: function(req,res,next){
			if(method=='get'){
				var params = req.query
					,id = params.id // 商品ID
					,uid = params.uid // 用户ID
					,count = params.count||1 //商品数量
					;
				//	获取商品信息
				productManager.getProduct(id,function(err,replies){
					if(err||!replies){
						res.send(responseData('err','不存在该商品'))
					}else{		
						var product = JSON.parse(replies)
							,now = Date.now()
							;
						// 先判断该商品是否正在销售
						if(product.status==productStatus.onSale&&product.saleStartTime<now&&product.saleOffTime>now){
							if(product.count<count){	//商品库存不够
								res.send(responseData('err','商品库存不够'))
							}else{	
								orderManager.getOrderByProductID(uid,id,function(err,replies){
									if(err){
										res.send(responseData('err',err))
									}else{
										// 每人每天限买一件
										for(var i=0,len=replies.length;i<len;i++){
											var small_order = replies[i];
											if(small_order.status==orderStatus.unpaid||small_order.status==orderStatus.paid){
												if(small_order.status == orderStatus.unpaid){
													// 存在未付款订单
													res.send(responseData('err','存在未付款订单'));
													return false;
												}else{
													if(new Date().toDateString()==new Date(small_order.timestamp).toDateString()){
														// 今天已经购买过该商品
														res.send(responseData('err','已经购买过该商品'));
														return false;
													}
												}
												
											}
										}
										res.send(responseData(true));
									}
								});	
							}			
						}else{
							res.send(responseData('err','商品尚未开放购买'))
						}	
					}
				});		
			}else{
				next();
			}
		},
		// 创建订单
		add: function(req,res,next){
			if(method=='post'){
				var params = req.body
					,id = params.productID
					,uid = params.userID
					,count = 1 //购买数量为1
					,orderStatus = orderManager.orderStatus
					;

				if(!uid){
					res.send(responseData('err','uid err'));
					return;
				}

				orderManager.getOrderByProductID(uid,id,function(err,replies){
					if(err){
						res.send(responseData('err',err));
					}else{
						// 判断是否有未付款订单，或者用户购买过该商品
						for(var i=0,len=replies.length;i<len;i++){
							var small_order = replies[i];
							if(small_order.status==orderStatus.unpaid||small_order.status==orderStatus.paid){
								if(small_order.status == orderStatus.unpaid){
									// 购买该商品还未付款
									res.send(responseData('err','存在未付款订单'));
									return false;
								}else{
									if(new Date().toDateString()==new Date(small_order.timestamp).toDateString()){
										// 已经购买过该商品
										res.send(responseData('err','已经购买过该商品'));
										return false;
									}
								}
								
							}
						}
						// 提交订单
						var order = {
							userID:params.userID,
							productID:params.productID,	//商品ID
							count:count,	//商品数量
							amount:params.amount,	// 订单总金额
							totalPrice:params.totalPrice,	
							oriPrice:params.oriPrice,	
							addressInfo:JSON.parse(params.addressInfo)
						};
						
						orderManager.createOrder(order,function(err,replies){
							if(err){
								res.send(responseData('err',err))
							}else{						
								res.send(_.extend({id:replies},responseData(true)));
							}
						});
						
					}
				});
			}else{
				next();
			}

		},
		// 关闭订单
		close: function(req,res,next){
			if(method=='post'){
				var params = req.body
					,id = params.id
					,uid = params.uid
					;
				orderManager.closeOrder(id,uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else{
						res.send(responseData(true))
					}
				})
			}else{
				next();
			}
		},
		// 获取用户未付款订单
		unpaid: function(req,res,next){
			if(method=='get'){
				var uid = req.query.uid
					,serverTime = Date.now()
					;
				orderManager.getUnpaidOrder(uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else{
						// 去除paymentNotice属性
						replies.forEach(function(val,i){
							var order = val;
							order = rebuildOrder(order);
							replies[i] = _.omit(order,'paymentNotice','operation','paymentplatform');
						});										
						var list = {list:replies,serverTime:serverTime};
						res.send(_.extend(responseData(true),list))
					}
				})

			}else{
				next();
			}
		},
		// 获取用户已支付订单
		paid: function(req,res,next){
			if(method=='get'){
				var uid = req.query.uid
					;
				orderManager.getPaidOrder(uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else{
						// 去除paymentNotice属性
						replies.forEach(function(val,i){
							var order = val;
							order = rebuildOrder(order);
							replies[i] = _.omit(order,'paymentNotice','operation','paymentplatform');
						});	
						var list = {list:replies};
						res.send(_.extend(responseData(true),list))
					}
				})

			}else{
				next();
			}
		},
		// 获取已经完成的订单
		complete: function(req,res,next){
			if(method=='get'){
				var uid = req.query.uid
					,start = req.query.start
					,count = req.query.count||20
					;
				orderManager.getCompleteOrder(uid,start,count,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else if(!replies){
						res.send(responseData('err'))
					}else{
						// 去除paymentNotice属性
						replies.forEach(function(val,i){
							var order = val;
							order = rebuildOrder(order);
							replies[i] = _.omit(order,'paymentNotice','operation','paymentplatform');
						});										
						var list = {list:replies};
						res.send(_.extend(responseData(true),list))
					}
				})

			}else{
				next();
			}
		},
		// 订单详情
		detail: function(req,res,next){
			if(method=='get'){
				var id = req.query.id
					,uid = req.query.uid
					,serverTime = Date.now()
					;
				orderManager.getUserOrderDetails(id,uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else if(replies){
						var order = replies;
						order = rebuildOrder(order);
						order = _.omit(order,'paymentNotice','operation','paymentplatform');
						res.send(_.extend(responseData(true),order))
					}else{ //数据为空
						res.send(responseData(true))
					}					
				})
			}else{
				next();
			}
		},
		// 设置订单为付款状态
		pay: function(req,res,next){
			if(method=='post'){
				var params = req.body
					,id = params.id
					,notify = params.notify||''	//支付宝成功返回的信息
					;
				orderManager.payOrder(id,notify,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else{
						res.send(responseData(true))
					}
				});
			}else{
				next();
			}
		},
		// 确认收货
		checkOrder: function(req,res){
			var id = req.body.id
				,uid = req.body.uid
				;
			if(method == 'post'){
				if(id&&uid){
					orderManager.checkOrder(id,uid,function(err,replies){
						if(err){
							res.send(responseData('err',err))
						}else{
							res.send(responseData(true))
						}
					})	
				}else{
					res.send(res.send(responseData('err','id or uid err')))
				}
			}else{
				next()
			}
		},
		getExpressInfo: function(req,res,next){			
			if(method=='get'){
				var id = req.query.id //订单ID
					;
				if(id){
					orderManager.getOrder(id,function(err,replies){
						if(replies){
							var order = JSON.parse(replies);
							var track_id = order.expressNumber
								,company_name = order.expressCompany
								,custom_express_info = order.customExpressInfo
								;	
							if(track_id&&company_name){
								xto.query(track_id, company_name, function(status, msg, json) {	
									var company_info = xto.getCompanyInfo(company_name); 
									json.nu = track_id;
									json.companyname = company_info.companyname;
									json.shortname = company_info.shortname;
									//如果有自定义快递信息，则合并
									if(custom_express_info){
										json.data = json.data||[];
										json.data = _.union(json.data,custom_express_info)
									}	
								    res.send(_.extend(responseData(true),json))
								});
							}else{
								var express = {
									data: custom_express_info
								};
								res.send(_.extend(responseData(true),data))
							}	
						}else{
							res.send(responseData('err'))
						}
					})
				}else{
					res.send(responseData('err'),'订单ID不能为空')
				}	
			}else{
				next();
			}		
		},
		// 返回
		trackView: function(req,res,next){
			var id = req.query.id
				,uid = req.query.uid
				,order = null
				;
			if(id&&uid){
				orderManager.getUserOrderDetails(id,uid,function(err,replies){
					if(replies){
						order = replies;
						var track_id = order.expressNumber
							,company_name = order.expressCompany
							,custom_express_info = order.customExpressInfo
							;	
						if(track_id&&company_name){
							xto.query(track_id, company_name, function(status, msg, json) {	
								var company_info = xto.getCompanyInfo(company_name); 
								json.nu = track_id;
								//如果有自定义快递信息，则合并
								if(custom_express_info){
									json.data = json.data||[];
									json.data = _.union(json.data,custom_express_info)
								}		
							    res.render('api/order_track',{order:order,express:json,company:company_info})
							});
						}else{
							res.render('api/order_track',{order:order,express:{
									data:custom_express_info
								}
							})
						}	
					}else{
						res.render('api/order_track',{order:order})
					}
				})
			}else{
				next()
			}
		},

	},
	// 地址API
	addr:{
		// 地址列表
		list: function(req,res,next){
			if(method=='get'){
				var uid = req.query.uid;
				addressManager.getAddressList(uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else if(!replies){
						res.send(responseData('err',err))
					}else{
						replies.forEach(function(val,i){
							var add = JSON.parse(val);
							add.provinceText = addressMap[add.province]&&addressMap[add.province][0];
							add.cityText = addressMap[add.city]&&addressMap[add.city][0];
							add.countyText = addressMap[add.county]&&addressMap[add.county][0];
							replies[i] = add;
						})
						var list = {list:replies};
						res.send(_.extend(responseData(true),list))
					}
				})
			}else{
				next();
			}
		},
		// 添加地址
		add: function(req,res,next){
			if(method=='post'){
				var params = req.body
					;			
				if(params.uid&&params.province&&params.city){
					var addr = {
							userID: params.uid,
							name:params.name,	//收件人
							province:params.province,	//省
							city:params.city,	//市
							county:params.county,	//区县
							postcode:params.postcode,	//邮箱
							details:params.details,	//详细地址
							mobilephone:params.mobilephone	//手机号码							
						};

					addressManager.addAddress(addr,function(err,replies){
						if(err){
							res.send(responseData('err',err))
						}else{
							var add = replies;
							add.provinceText = addressMap[add.province]&&addressMap[add.province][0];
							add.cityText = addressMap[add.city]&&addressMap[add.city][0];
							add.countyText = addressMap[add.county]&&addressMap[add.county][0];
							res.send(_.extend(responseData(true),add))
						}
					});
				}else{
					res.send(responseData('err','params err'));
					return;
				}						

			}else{
				next();
			}
		},
		// 更新地址
		update: function(req,res,next){
			if(method=='post'){
				var params = req.body
					,id = params.id
					;				
				if(params.province&&params.city){
					var addr = {
							name:params.name,	//收件人
							province:params.province,	//省
							city:params.city,	//市
							county:params.county,	//区县
							postcode:params.postcode,	//邮箱
							details:params.details,	//详细地址
							mobilephone:params.mobilephone	//手机号码							
						};
					addressManager.editAddress(id,addr,function(err,replies){
						if(err){
							res.send(responseData('err',err))
						}else{
							res.send(responseData(true))
						}
					});
				}else{
					res.send(responseData('err','mapCode err'))
				}

			}else{
				next();
			}
		},
		// 删除地址
		del: function(req,res,next){
			if(method=='post'){
				var params = req.body
					,id = params.id
					,uid = params.uid
					;
				addressManager.deleteAddress(id,uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else{
						res.send(responseData(true))
					}
				});

			}else{
				next();
			}
		},
		// 返回默认地址
		defaultAddr: function(req,res,next){
			if(method=='get'){
				var uid = req.query.uid;
				addressManager.getDefaultAddress(uid,function(err,replies){
					if(err){
						res.send(responseData('err',err))
					}else if(!replies){
						res.send(responseData(true))
					}else{
						var add = JSON.parse(replies);
						add.provinceText = addressMap[add.province]&&addressMap[add.province][0];
						add.cityText = addressMap[add.city]&&addressMap[add.city][0];
						add.countyText = addressMap[add.county]&&addressMap[add.county][0];
						res.send(_.extend(responseData(true),add))
					}
				})
			}else{
				next()
			}
		},
		// 设置默认地址
		setDefault: function(req,res,next){
			if(method=='post'){
				var uid = req.body.uid
					,id = req.body.id
					;
				userManager.setDefaultAddress(uid,id,function(err,replies){				
					if(err){
						res.send(responseData('err',err))
					}else{
						res.send(responseData(true))
					}
				});
			}else{
				next();
			}
		}

	}

};

// 重新构建订单
var rebuildOrder = function(order){
	var serverTime = Date.now();
	order.serverTime = serverTime;
	if(order.paymentplatform){
		order.paymentPlatform = order.paymentplatform;
	}
	if(!order.customExpressInfo.length){
		order.customExpressInfo = null;
	}
	// 获取快递公司中文名称
	if(order.expressCompany){
		order.companyName = xto.getCompanyInfo(order.expressCompany).companyname;	
	}						
	return order;
}

module.exports.index = function (req,res,next) {

	method = req.method.toLowerCase();
	var model = req.params.model
		,action = req.params.action
		,token = req.param('token')
		,app = req.params.app||'android'	// 应用类型
		,tokens = global.appConfig.tokens	
		;

	if(API[model]&&API[model][action]){
		if(token==crypto.md5(tokens[app])){
			API[model][action](req,res,next);
		}else{
			res.send(responseData('err','token error'))
		}
	}else{
		next();
	}

};