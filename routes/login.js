var service = require('../base/thirdService')
	,crypto = require('../base/crypto')
	,userManager = require('../base/userManager')
	,serviceConfig = require('../base/serviceConfig')
	,_ = require('underscore')
	,querystring = require('querystring')
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
*	p="alipay"是使用支付宝登陆；p="weibo"是使用微博登录
*
**/
module.exports.loginRedirect = function (req,res) {
	var p = req.query.p;
	switch(p){
		// 新浪微博登录
		case 'weibo':
			res.redirect(service.weibo_getLoginUrl());
		break;
		// QQ登录
		case 'qq':
		    res.redirect(service.qq_getLoginUrl());
		break;
		// 支付宝登录
		case 'alipay':
		default:
			res.redirect(service.alipay_getLoginUrl());
	}
}

/**
*	用户退出登录
**/
module.exports.logout = function(req,res){
	var config = global.appConfig
		,authCookie = config.cookie.authCookie
		;
	// 清楚session和cookie
	req.session.userInfo = null;
	res.clearCookie(authCookie);
	res.redirect("/");
}

/*
*	第三方登陆回调页面，获取第三方平台用户信息后登录
*/
module.exports.loginReturn = function(req,res){
	var p = ''
		,pid = ''
		,code = req.query.code	// 新浪微博登录后会返回code
		,state = req.query.state // qq登录后除了返回code还有state
		,token = req.query.access_token	// qq登录使用get方式返回token
		,config = global.appConfig
		,now = Date.now()
		,authCookie = config.cookie.authCookie
		,path = req.session.loginReferer||'/user/home'
		,user = {}
		;
	// qq登录后返回code，然后再利用code获取token
	if(code&&state){
		p = 'qq';
		pid = serviceConfig[p].pid;
		// 获取access token
		service.qq_getAccessTokenUrl(code,function(replies){
			var data = querystring.parse(replies)
				,token = data.access_token
				;
					
			if(token){
				// 获取openid
				service.qq_getOpenID(token,function(replies){
					// replies的结构如下，所以必须处理后才能转换成JSON
					//callback( {"client_id":"100330589","openid":"00433187EF7EDBDD677E5DD6C68E7E24"} );
					var data = JSON.parse(replies.slice(10,-3))
						,openid = data.openid
						;
					user.id = pid+'-'+openid;
					userManager.isExistUser(user.id,function(err,replies){
						if(err){
							res.send('登录错误')
						}else{						
							if(replies){	//该用户已经存在，直接登录
								userLogin(user);
							}else{
								var id = pid+'-'+openid;
								// 获取用户信息
								service.qq_getUserInfo(token,openid,function(replies){				
									console.log(replies)
									var data = JSON.parse(replies);
									if(data.nickname&&data.figureurl_2){									
										user = {
											id: id,
											pid:pid,
											pUserID:openid,
											pUserName:data.nickname,
											userName:data.nickname,
											profile_image_url:data.figureurl_2						
										}
										userLogin(user);
									}else{
										res.send('获取QQ用户信息出错')
									}

								})
							}
						}
					})
				})
			}else{
				res.send('QQ登录获取access_token失败')
			}
		});		
	}else if(code){	//存在code表示使用新浪微博登录
		p = 'weibo';
		pid = serviceConfig[p].pid
		service.weibo_getAccessToken(code,function(replies){
			var data = JSON.parse(replies)
				,token = data.access_token
				,uid = data.uid	
				;
			user.id = pid+'-'+uid				
			userManager.isExistUser(user.id,function(err,replies){
				if(err){
					res.send('登录错误')
				}else{					
					if(replies){	//该用户已经存在，直接登录
						userLogin(user);
					}else{
						// 获取用户信息
						service.weibo_getUserInfo(data.access_token,data.uid,function(replies){				
							var data = JSON.parse(replies);
							if(data.id&&data.name){
								var id = pid+'-'+data.id
								user = {
									id: id,
									pid:pid,
									pUserID:data.id,
									pUserName:data.name,
									userName:data.name,
									profile_image_url:data.profile_image_url						
								}
								userLogin(user);
							}else{
								res.send('获取微博用户信息出错')
							}

						})
					}
				}
			})

		})
	}else if(req.query.is_success=="T"){
		p = 'alipay';
		pid = serviceConfig[p].pid
		var authInfo = req.query;
		var id = pid+"-"+authInfo.user_id;
		authInfo.id = id;
		user = {
			id: id,
			pid:pid,
			pUserID:authInfo.user_id,
			pUserName:authInfo.real_name,
			userName:authInfo.real_name
		}
		userLogin(user);
	}else{
		res.send('登录错误')
	}	
	// 用户登录
	function  userLogin(user){
		var id = user.id;	
		userManager.getUser(id,function(err,replies){	//判断用户是否存在
			if(err){
				res.send('登录错误')
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
	}		
}

/*
*	用户自动登录
*/
module.exports.autoLogin = function(req,res,next){
	var config = global.appConfig
		,authCookie = config.cookie.authCookie
		,path = req.path.length>1&&req.path.lastIndexOf('/')==req.path.length-1?req.path.substr(0,req.path.length-1):req.path
		,noLoginUrl = ['/','/about','/welcome','/login','/logout','/loginRedirect','/loginReferer','/loginReturn','/purchase/pay_notify',
				'/product/details','/product/getUserInfo']
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
