var service = require('../base/thirdService')
	,crypto = require('../base/crypto')
	,userManager = require('../base/userManager')
	,_ = require('underscore')
	;

/**
*	用户登录页
*/
module.exports.login = function(req,res){

	var m = req.method
		,user = req.session.userInfo
		;
	//如果已经登录跳转到中户中心
	if(user){
		res.redirect('/user/home')
	}else{
		res.render('login')
	}			

}

/**
*	第三方登陆链接
*	p="alipay"是使用支付宝登陆；p="weixin"是使用微信登陆
*
**/
module.exports.loginRedirect = function (req,res) {
	var p = req.query.p;
	switch(p){
		case "wx":
		break;
		default:
			res.redirect(service.alipay_getLoginUrl());
	}
}

/**
*	用户退出登录
**/
module.exports.logout = function(req,res){
	var config = res.locals.config
		,authCookie = config.cookie.authCookie
		;
	// 清楚session和cookie
	req.session.userInfo = null;
	res.clearCookie(authCookie);
	res.redirect("/");
}

/*
*	第三方登陆回调页面
*/
module.exports.loginReturn = function(req,res){
	var p = req.query.p
		,pid = p=='alipay'?2:1
		,config = global.appConfig
		,now = Date.now()
		,authCookie = config.cookie.authCookie
		,path = req.session.loginReferer||'/user/home'
		;
	if(req.query.is_success=="T"){
		var authInfo = req.query;
		var id = pid+"-"+authInfo.user_id;
		authInfo.id = id;
		var user = {
			id: id,
			pid:pid,
			pUserID:authInfo.user_id,
			pUserName:authInfo.real_name,
			userName:authInfo.real_name
		}		

		userManager.getUser(id,function(err,replies){	//判断用户是否存在
			if(err){
				res.send('判断用户存在失败')
			}else{
				req.session.loginReferer = '';
				if(replies==null){	// 用户不存在
					userManager.createUser(user,function(err,replies){
						if(err){
							res.send('创建用户失败')
						}else{
							res.cookie(authCookie,id,{
								signed:true,
								maxAge:config.cookie.maxAge
							});
							res.redirect(path)	
						}
					})
				}else{
					user = JSON.parse(replies);
					res.cookie(authCookie,id,{
						signed:true,
						maxAge:config.cookie.maxAge
					});
					res.redirect(path)	
				}					
			}
			req.session.userInfo = user;	//session 保存用户信息
		})			
	}else{
		res.send('登录错误')
	}
	
}

/*
*	用户自动登录
*/
module.exports.autoLogin = function(req,res,next){
	var config = global.appConfig
		,authCookie = config.cookie.authCookie
		,path = req.path.length>1&&req.path.lastIndexOf('/')==req.path.length-1?req.path.substr(0,req.path.length-1):req.path
		,noLoginUrl = ['/','/login','/logout','/loginRedirect','/loginReferer','/loginReturn','/purchase/pay_notify',
				'/product/details']
		,isAdminPath = path.indexOf('/admin')!=-1
		;
	if(isAdminPath){
		if(path=='/admin/login'){
			next();
		}else{
			if(req.session.userInfo&&req.session.userInfo.role=='admin'){
				next();
			}else{
				// 保存referrer到session 登录后跳转到该地址
				req.session.referrer = req.originalUrl;
				res.redirect('/admin/login')
			}
		}
	}else{
		if(!req.session.userInfo){
			var id = req.signedCookies[authCookie];
			if(id){
				userManager.getUser(id,function(err,replies){
					if(replies){	// 存在用户					
						req.session.userInfo = JSON.parse(replies);
						next();
					}else{	//用户不存在，则清除cookie并且跳转
						res.clearCookie(authCookie);
						if(_.contains(noLoginUrl,path)){
							next();
						}else{
							res.redirect('/login');
						}					
					}				
				})
			}else{	//不存在cookie
					
				if(path.indexOf('/purchase/addto_cart')!=-1){
					req.session.loginReferer = '/'
				}
				if(_.contains(noLoginUrl,path)){
					next();
				}else{
					res.redirect('/login');
				}
			}		
		}else{
			next();
		}		
	}

}
