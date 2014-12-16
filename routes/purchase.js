// require denpendency modules
var userManager = require('../base/userManager')
	,cartManager = require('../base/cartManager')
	,orderManager = require('../base/orderManager')
	,orderStatus = orderManager.orderStatus
	,productManager = require('../base/productManager')
	,productStatus = productManager.productStatus
	,service = require('../base/thirdService')
	,_ = require('underscore')
	,DOMParser = require('xmldom').DOMParser
	;

var error = {
	"noProducts":1,	// 商品不存在
	"unpaid":2,	// 存在未付款订单
	"hasOne":3,	// 已经购买过该商品
	"isAdmin":4,
	"notSale":5,
	"soldOut":6	//商品已售罄
}

var method = ''
	,user = null
	;

var actions = {

	// 用于异步添加商品到购物车
	addto_cart: function(req,res){
		
		var id = req.param('id')
			,user = req.session.userInfo
			,uid = user.id
			,count = 1	//商品购买数量
			;
		// 管理员不能购买商品
		if(user.role=='admin'){
			res.send({
				err:error.isAdmin
			})
		}else{
			if(id){
				//	获取商品信息
				productManager.getProduct(id,function(err,replies){
					if(err||!replies){
						res.send({
							err:error.noProducts,
						})
					}else{
						var product = JSON.parse(replies)
							,now = Date.now()
							;
						// 先判断该商品是否正在销售
						if(product.status==productStatus.onSale&&product.saleStartTime<now&&product.saleOffTime>now){
							if(product.count<count){	//商品库存不够
								res.send({
									err:error.soldOut
								})
							}else{	
								orderManager.getOrderByProductID(uid,id,function(err,replies){
									if(err){
										res.send(false)
									}else{
										// 每人每天限买一件
										for(var i=0,len=replies.length;i<len;i++){
											var small_order = replies[i];
											if(small_order.status==orderStatus.unpaid||small_order.status==orderStatus.paid){
												if(small_order.status == orderStatus.unpaid){
													// 存在未付款订单
													res.send({
														err:error.unpaid
													});
													return false;
												}else{
													if(new Date().toDateString()==new Date(small_order.timestamp).toDateString()){
														// 今天已经购买过该商品
														res.send({
															err:error.hasOne
														})
														return false;
													}
												}
												
											}
										}

										// 可以添加商品到购物车
										var cart = {
											productID: id,
											userID:user.id,
											count:count,
											price:product.price,
											oriPrice:product.oriPrice,
											freight:product.freight
										};
										cartManager.addtoCart(cart,function(err,replies){
											if(err){
												res.send(false);
											}else{
												res.send({
													res:true
												});
											}
										})
									}
								});
							}
						}else{
							res.send({
								err:error.notSale
							})
						}
					}
				})

			}else{
				res.send(false);
			}
		}
	},
	// 支付订单
	pay: function(req,res){
		var params = req.query
			,id = params.id
			,title = 'Taoyige'	// 使用中文会出错，应该是支付宝对参数编码的问题
			,amount = params.amount
			,purl = params.purl||'http://www.taoyige.com/logo.png'
			,desc = params.desc||title
			;

		if(id){
			orderManager.getOrder(id,function(err,replies){
				//存在订单才能支付
				if(replies){
					var order = JSON.parse(replies);
					//判断订单状态是否未支付
					if(order.status==orderStatus.unpaid){
						var paidOrder = {
							id:id,
							title:title,
							amount:order.amount,
							purl:purl,
							desc:desc
						}
						
						var isMobile = req.get('user-Agent').indexOf('Mobile')==-1?false:true;		
						if(isMobile){
							service.alipay_getWapDirectPayUrl(paidOrder,function(url){
								res.redirect(url);
							});		
						}else{
							service.alipay_getDirectPayUrl(paidOrder,function(url){
								res.redirect(url);
							})
						}
					}else{
						res.send('订单状态错误')
					}

				}else{
					res.send('订单不存在')
				}
			});
		}else{
			res.send('支付失败')
		}
	},
	// 支付成功返回地址
	pay_return:function(req,res){
		var user = req.session.user
		if(!_.isEmpty(req.query)){
			var notice = req.query
				,out_trade_no = notice.out_trade_no	//订单id
				,total_fee = notice.total_fee	//订单金额
				,notify_time = notice.notify_time 
				;
			var trade = {
				out_trade_no: out_trade_no,
				total_fee: total_fee,
				notify_time: notify_time
			}
			// 校验返回信息的真实性
			service.verifyReturn(req.query,function(replies){
				if(replies){
					if(notice.trade_status=='TRADE_SUCCESS'||notice.result=='success'){	// 支付成功
						orderManager.payOrder(out_trade_no,JSON.stringify(notice),function(err,replies){
							if(err){
								res.render('purchase/pay_faild',{user:user,trade:trade})
							}else{
								res.render('purchase/pay_success',{user:user,trade:trade})
							}								
						});
					}else{	//支付失败
						res.render('purchase/pay_faild',{user:user,trade:trade})
					}
				}else{
					res.render('purchase/pay_faild',{user:user,trade:trade})
				}
			});
		}else{
			res.render('purchase/pay_faild',{user:user,trade:null})
		}
	},
	// 支付消息异步通知
	pay_notify: function(req,res){		
		var notice = req.body;
		if(!_.isEmpty(notice)){
			service.verifyNotify(notice,function(replies){
				if(replies){
					var out_trade_no = ''
						,trade_status = ''
						;
					if(notice.notify_data){
						var doc = new DOMParser().parseFromString(notice['notify_data'],'text/xml');
						out_trade_no = doc.documentElement.getElementsByTagName('out_trade_no')[0].lastChild.data;
						trade_status = doc.documentElement.getElementsByTagName('trade_status')[0].lastChild.data;
					}else{
						out_trade_no = notice.out_trade_no;
						trade_status = notice.trade_status;
					}
					if(trade_status=='TRADE_SUCCESS'||trade_status=='TRADE_FINISHED'){
						orderManager.payOrder(out_trade_no,notice,function(err,replies){
							if(err){
								res.send('fail')
							}else{
								res.send('success')
							}								
						});	
					}else{
						res.send('fail')
					}
					
				}else{
					res.send('fail')
				}
			})
		}else{
			res.send('fail')
		}

	},
	// 支付失败跳转
	backto_merchant: function(req,res){
		res.redirect('/user/home')
	}
}


module.exports.index = function(req,res){
	var action = req.params.action
		;
	method = req.method.toLowerCase();
	user = req.session.userInfo;

	if(action&&actions[action]){
		actions[action](req,res);		
	}else{
		res.send("无法访问"+req.path)
	}

};