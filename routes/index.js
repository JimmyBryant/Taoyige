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
var node_path = require('path');
var fs = require('fs');

//自动登录
router.use(login.autoLogin);

// 首页
router.get('/welcome', function(req,res){
	var session = req.session
		,user = session.userInfo
		;
	var file_name = new Date(new Date().toDateString()).valueOf()+'.html'
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
