// require denpendency modules
var addressMap = require('../base/addressMap')
	,userManager = require('../base/userManager')
	,addressManager = require('../base/addressManager')
	,orderManager = require('../base/orderManager')
	,_ = require('underscore')
	;

var method = ''
	,user = null
	;

var controller = {
	
	// 用户中心首页
	home: function(req,res){
		var m = req.method
			,user = req.session.userInfo
			;
		if(m=='GET'){
			res.render('user/home',{user:user,loginPlatform:userManager.loginPlatform});
		}
	},
	// 收货地址列表页面
	myAddress: function(req,res){
		var user = req.session.userInfo
			;
		addressManager.getAddressList(user.id,function(err,replies){
			res.render('user/my_address',{user:user,err:err,addressList:replies,addressMap:addressMap});
		})
	},
	//  增加收货地址
	addAddress: function(req,res){
		var m = req.method
			,user = req.session.userInfo
			,act = req.query.act||''
			;
		if(m=='GET'){
			res.render('user/add_address',{user:user,action:act});
		}else if(m=='POST'){
			var act = req.body.action;
			_.omit(req.body,'action');			
			var address = req.body;
			address.userID = user.id;
			addressManager.addAddress(address,function(err,replies){
				if(err){
					res.send('error')
				}else{
					if(act=='order'){	//跳转到订单页面
						res.redirect('/order/create')
					}else if(act=='select'){	//选择收货地址
						res.redirect('/user/select_address')
					}else{	//跳转到地址列表页
						res.redirect('/user/myAddress')						
					}
				}
			});			
		}
	},
	// 修改收货地址
	editAddress: function(req,res){
		var m = req.method
			,id = req.query.id
			;

		if(m=='GET'){
			var address = null
				,act = req.query.act||'';
			if(id){
				addressManager.getAddress(id,function(err,replies){
					if(replies){
						address = JSON.parse(replies);
					}
					res.render('user/edit_address',{user:user,address:address,addressMap:addressMap,act:act});
				})
			}else{
				res.render('user/edit_address',{user:user,address:address,addressMap:addressMap});
			}

		}else if(m=='POST'){
			var address = req.body;
			var act = req.body.act;
			addressManager.editAddress(id,address,function(err,replies){
				if(err){
					res.send('服务器出错了')
				}else{
					if(act=='select'){
						res.redirect('/user/select_address')
					}else{
						res.redirect('/user/myAddress')
					}					
				}
			});
		}
	},
	// 异步删除收货地址
	deleteAddress: function(req,res){
		var id = req.param('id')
			,uid = req.session.userInfo.id
			;
		if(id){
			addressManager.deleteAddress(id,uid,function(err,replies){
				if(err){
					res.send(false)
				}else{
					res.send(true)
				}
			});
		}else{
			res.send(false)
		}

	},
	//选择收货地址
	select_address: function(req,res){
		var id = req.query.id;
		if(method=='get'){
			if(id){
				userManager.setDefaultAddress(user.id,id,function(err,replies){
					res.redirect('/order/create')
				})
			}else{
				userManager.getUser(user.id,function(err,replies){
					if(replies){
						user = JSON.parse(replies)
					}
					addressManager.getAddressList(user.id,function(err,replies){
						res.render('user/select_address',{user:user,addressList:replies,addressMap:addressMap});
					})	
				})
			}		
		}

	},
	orderDetails: function(req,res){
		var user = req.session.userInfo
			,uid = user.id
			,id = req.query.id
			;
		orderManager.getOrder(id,function(err,replies){
			res.render('user/order_details',{order:order,user:user})
		})
	}
};


module.exports.index = function(req,res,next){
	var action = req.params.action;

	method = req.method.toLowerCase();
	user = req.session.userInfo;
	path = req.path;
	if(action&&controller[action]){
		controller[action](req,res);
	}else{
		res.send("无法访问"+req.path)
	}

};
