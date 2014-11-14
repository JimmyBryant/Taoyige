// require denpendency modules
var userManager = require('../base/userManager')
	,cartManager = require('../base/cartManager')
	,orderManager = require('../base/orderManager')
	,productManager = require('../base/productManager')
	,addressManager = require('../base/addressManager')
	,addressMap = require('../base/addressMap')
	,xto = require("xto")
	,_ = require('underscore')
	;

var method = ''
	,user = null
	;
var actions = {
	
	//创建商品订单
	create: function(req,res){
		var uid = user.id
			;
		if(method=='get'){
			addressManager.getDefaultAddress(uid,function(err,replies){
				if(err){
					res.send(err)
				}else{
					if(replies){
						var address = JSON.parse(replies);
						// 将收货地址保存到session
						req.session.address = {
							name: address.name,
							mobilephone: address.mobilephone,
							details:addressMap[address.province][0]+addressMap[address.city][0]+addressMap[address.city][0]+address.details
						};
						cartManager.getCart(uid,function(err,replies){
							if(err||!replies){
								res.redirect('/user/home')
							}else{
								var cart = JSON.parse(replies);								
								res.render('order/order_create',{user:user,cart:cart,addr:address,addressMap:addressMap})
							}
						});
					}else{
						res.redirect('/user/addAddress?act=order')
					}
				}
			});

		}else if(method=='post'){
			var addressID = req.body.addressID
				;
			// 查询购物车获取订单信息
			cartManager.getCart(uid,function(err,replies){
				if(err||!replies){
					res.send('创建订单失败')
				}else{
					var cart = JSON.parse(replies);					
					var freight = 0
						,totalPrice = cart.price*cart.count
						,oriPrice = cart.oriPrice*cart.count
						;
					var order = {
						userID: uid,
						productID:cart.productID,
						count:cart.count,
						freight:0,	//运费
						oriPrice:oriPrice,	// 商品原价总金额
						totalPrice:totalPrice,	//商品总金额
						amount:totalPrice+freight,	//订单总金额						
						paymentplatform: 2,
						addressInfo:req.session.address
					}
					orderManager.createOrder(order,function(err,replies){
						if(err){
							res.send(err)
						}else{
							//清空购物车
							cartManager.emptyCart(uid,function(err,replies){
								if(err){
									console.log('购物车清空失败')
								}
							});
							res.redirect('/purchase/pay?id='+replies);
						}
					})
				}
			});
		}
	},
	//	待支付订单
	unpaid: function(req,res){
		var user = req.session.userInfo
			,uid = user.id
			;
		if(method=='get'){
			orderManager.getUnpaidOrder(uid,function(err,replies){
				var orderlist = [];
				if(replies){
					orderlist = replies;
				}
				res.render('order/order_unpaid',{orderlist:orderlist,user:user,orderStatus:orderManager.orderStatus})
			})
		}
	},
	// 已付款订单
	paid: function(req,res){
		var user = req.session.userInfo
			,uid = user.id
			;
		if(method=='get'){
			orderManager.getPaidOrder(uid,function(err,replies){
				var orderlist = [];
				if(replies){
					orderlist = replies;
				}
				res.render('order/order_paid',{orderlist:orderlist,user:user,orderStatus:orderManager.orderStatus})
			})
		}
	},
	// 获取未完成的订单
	uncomplete: function(req,res){
		var user = req.session.userInfo
			,uid = user.id
			;
		if(uid){
			orderManager.getUncompleteOrder(uid,function(err,replies){
				var data = {};
				if(!err){
					data.orderlist = replies;
				}
				res.send(data);
			})
		}else{
			res.send(false)
		}
	},
	// 获取已经关闭或者交易完成的订单
	complete: function(req,res){
		var uid = user.id
			,start = req.query.start||0
			,count = 10
			;
		if(method=='get'){
			orderManager.getCompleteOrder(uid,start,count,function(err,replies){
				var orderlist = [];
				if(replies){
					orderlist = replies;
				}
				res.render('order/order_complete',{orderlist:orderlist,user:user,orderStatus:orderManager.orderStatus})
			})
		}
	},
	// 用于异步获取已经关闭或者交易完成的订单
	asyncComplete: function(req,res) {
		var uid = user.id
			,start = parseInt(req.query.start)||0
			,count = 10
			;		
		if(method=='get'){
			orderManager.getCompleteOrder(uid,start,count,function(err,replies){
				var orderlist = [];
				if(replies){
					orderlist = replies;
				}
				res.send(orderlist);
			})
		}
	},
	// 订单详情
	details: function(req,res){
		var user = req.session.userInfo
			,id = req.query.id
			,uid = user.id
			,order = null
			;
		if(method=='get'){
			if(id){
				orderManager.getUserOrderDetails(id,uid,function(err,replies){
					if(replies){
						var order = replies;
						res.render('order/order_details',{user:user,order:order,orderStatus:orderManager.orderStatus})
					}else{
						res.render('order/order_details',{user:user,order:order})
					}
				})
			}else{
				res.render('order/order_details',{user:user,order:order})
			}
		}
	},
	// 订单跟踪
	track: function(req,res){
		var uid = user.id
			;
		var order = null;
		if(method=='get'){
			var id = req.query.id;
			if(id){
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
							    res.render('order/order_track',{order:order,express:json,company:company_info})
							});
						}else{
							res.render('order/order_track',{order:order,express:{
									data:custom_express_info
								}
							})
						}	
					}else{
						res.render('order/order_track',{order:order})
					}
				})
			}else{
				res.render('order/order_track',{order:order})
			}			
		}

	},
	// 确认收货，验收订单
	checkOrder: function(req,res){
		var id = req.query.id
			,uid = user.id
			;
		if(method == 'get'){
			if(id){
				orderManager.checkOrder(id,uid,function(err,replies){
					if(err){
						res.send(false)
					}else{
						res.send(true)
					}
				})	
			}else{
				res.send(false)
			}
		}
	},
	//用于关闭过期未支付的订单
	close: function(req,res){
		var uid = user.id
			,id = req.query.id
			;
		if(method=='get'){
			if(id){
				orderManager.closeOrder(id,uid,function(err,replies){
					res.redirect('/order/details?id='+id)
				})	
			}else{
				res.redirect('/order/details?id='+id)
			}	
		}

	},
	//自动关闭过期订单
	autoClose: function(req,res){
		if(method=='get'){
			var id = req.query.id
				;
			if(id){
				orderManager.closeOutdatedOrder(id,function(err,replies){
					if(err||!replies){
						res.send(false)
					}else{
						res.send(true)
					}
				});
			}else{
				res.send(false)
			}
		}
	}
}


module.exports.index = function(req,res,next){
	var action = req.params.action
		;
	method = req.method.toLowerCase();		
	user = req.session.userInfo;
	if(action&&actions[action]){
		actions[action](req,res);		
	}else{
		next();
	}

};