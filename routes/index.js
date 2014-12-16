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
var api = require('./api');
var apps = require('./apps');
var productManager = require('../base/productManager');
var node_path = require('path');
var fs = require('fs');

// 首页
router.get('/welcome', function(req,res){
	var session = req.session
		,user = session.userInfo
		;
	var  date = new Date()
		,Y = date.getFullYear().toString()
		,M = date.getMonth()+1
		,D = date.getDate()
		,file_name = Y+(M<10?'0'+M:M)+(D<10?'0'+D:D)+'.html'
		,path = node_path.join(__dirname,'../public/html/',file_name)
		; 
	var hasHtmlPage = fs.existsSync(path); // 是否存在静态页面
	if(hasHtmlPage){
		res.redirect('html/'+file_name);
	}else{
		productManager.getTodayProduct(function(err,replies){
			var product = replies||null;
			productManager.getProductReadySale(function(err,replies){
				var readylist = [];
				if(replies){
					readylist = replies;
				}
				admin.HTML_index(product,readylist);	// 生成静态页面
				res.render('index', {product:product,readylist:readylist,user:user});	
			})		
		})
	}		
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
// app版本信息
router.route('/apps/version/:action').all(apps.index);
router.route('/apps/welcome/:action').all(apps.images);
// API路由
router.route('/api/:model/:action').all(api.index);
//退出登录
router.get('/logout',login.logout);
// 需要验证登录
router.route('/user/:action').all(login.autoLogin).all(user.index);
router.route('/purchase/:action').all(login.autoLogin).all(purchase.index);
router.route('/order/:action').all(order.index);
router.route('/product/:action').all(product.index);
// 管理员路径
router.route('/admin/:action').all(login.autoLogin).all(admin.index);
router.route('/admin/orders/:action').all(login.autoLogin).all(admin.order);
router.route('/admin/product/:action').all(login.autoLogin).all(admin.product);
router.route('/admin/apps/:action').all(login.autoLogin).all(admin.apps);

module.exports = router;
