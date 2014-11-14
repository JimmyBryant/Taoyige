// require denpendency modules
var express = require('express');
var router = express.Router();
var config = require('../config');
var login = require('./login');
var user = require('./user');
var product = require('./product');
var admin = require('./admin');
var purchase = require('./purchase');
var order = require('./order');
var productManager = require('../base/productManager');

//自动登录
router.use(login.autoLogin);

// 首页
router.get('/welcome', function(req,res){
	var session = req.session
		,user = session.userInfo
		;
	productManager.getTodayProduct(function(err,replies){
		var product = replies||null;
		productManager.getProductReadySale(function(err,replies){
			var readylist = [];
			if(replies){
				readylist = replies;
			}
			res.render('index', {product:product,readylist:readylist,user:user});	
		})		
	})		
});

// 关于淘一个
router.get('/',function(req,res){
	var session = req.session
		,user = session.userInfo
		;
	res.render('intro/about',{user:user})
})
// 关于我们
router.get('/about',function(req,res){
	var session = req.session
		,user = session.userInfo
		;
	res.render('intro/about',{user:user})
})

// 登录
router.get('/login',login.login);
router.get('/loginRedirect',login.loginRedirect);
router.get('/loginReturn',login.loginReturn);
//退出登录
router.get('/logout',login.logout);
// 
router.use('/user/:action',user.index);
router.use('/purchase/:action',purchase.index);
router.use('/order/:action',order.index);
router.use('/product/:action',product.index);
// 管理员路径
router.use('/admin/:action',admin.index);
router.use('/admin/orders/:action',admin.order);
router.use('/admin/product/:action',admin.product);
module.exports = router;
