// require dependency modules
var https = require('https')
	,http = require('http')
	,querystring = require('querystring')
	,fs = require('fs')
	,DOMParser = require('xmldom').DOMParser
	,crypto = require('./crypto')
	,_ = require('underscore')
	,serviceConfig = require('./serviceConfig')	
	;

var alipayGateway = "https://mapi.alipay.com/gateway.do";
var alipayGateway_wap = 'http://wappaygw.alipay.com/service/rest.htm';
var https_verify_url = 'https://mapi.alipay.com/gateway.do?service=notify_verify&';
var http_verify_url = 'http://notify.alipay.com/trade/notify_query.do?';
var aliConfig = serviceConfig.alipay;
module.exports = {
	// 新浪微博登录授权api url
	weibo_getLoginUrl: function(){
		var config = serviceConfig.weibo.quickLogin;
		var url = 'https://api.weibo.com/oauth2/authorize?client_id='
				+ config.id
				+'&response_type=code&redirect_uri='
				+ config.returnUrl;
		return url;
	},
	// HTTPS POST 获取新浪微博access token
	weibo_getAccessToken: function(code,callback){
		var config = serviceConfig.weibo.quickLogin;
		var post_data = {
			client_id:config.id,
			client_secret:config.secret,
			grant_type:'authorization_code',
			redirect_uri:config.returnUrl,
			code:code
		}
		post_data = querystring.stringify(post_data);
		var options = {
			hostname:'api.weibo.com',
			path:'/oauth2/access_token',
			method:'POST',
			headers:{
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': post_data.length
			}
		}
		var req = https.request(options,function(res){
			res.setEncoding('utf8');
			res.on('data', function (chunk) {			
				var chunk = decodeURIComponent(chunk);
				callback(chunk);
				return;
			})
		});
		req.write(post_data);
		req.end();
		req.on('error',function(e){
			 console.error(e);
		})	

	},
	// 通过access token获取用户信息
	weibo_getUserInfo: function(token,uid,callback){
		var config = serviceConfig.weibo.quickLogin;
		var api = "https://api.weibo.com/2/users/show.json?access_token="
			+token
			+'&uid='
			+uid
			;
		https.get(api,function(res){
			res.on('data',function(chunk){
				var chunk = decodeURIComponent(chunk);
				callback(chunk)
				return;
			});
		}).on('error',function(e){
			console.error(e)
		})

	},
	// QQ登录授权api url
	qq_getLoginUrl: function(){
		var config = serviceConfig.qq.quickLogin;
		var api = 'https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id='
				+ config.id
				+ '&redirect_uri='
				+ encodeURIComponent(config.returnUrl)
				+ '&state='
				+ Date.now()
				;
		return api;
	},
	// 获取access token
	qq_getAccessTokenUrl: function(code,callback){
		var config = serviceConfig.qq.quickLogin;
		var api = 'https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id='
				+ config.id
				+ '&client_secret='
				+ config.secret
				+ '&code='
				+ code
				+ '&redirect_uri='
				+ encodeURIComponent(config.returnUrl)
				;
		https_get(api,callback);
	},
	// QQ获取用户的openid后才能调用其他api
	qq_getOpenID: function(token,callback){
		var api = 'https://graph.qq.com/oauth2.0/me?access_token='+token;
		https_get(api,callback);
	},
	// QQ 获取用户信息
	qq_getUserInfo: function(token,openid,callback){
		var config = serviceConfig.qq.quickLogin;
		var api = 'https://graph.qq.com/user/get_user_info?access_token='
				+token
				+'&oauth_consumer_key='
				+config.id
				+'&openid='
				+openid
				;
		https.get(api,function(res){
			res.setEncoding('utf8');
			res.on('data', function (chunk) {			
				var chunk = decodeURIComponent(chunk);
				callback(chunk);
				return;
			})
		}).on('error',function(e){
			console.error(e)
		})				
	},
	// 支付宝登录授权api url
	alipay_getLoginUrl : function(){
		var params =   {
			"_input_charset" : "utf-8",
			"partner" : aliConfig.quickLogin.id.trim(),
			"return_url" : aliConfig.quickLogin.returnUrl,
			"service" : "alipay.auth.authorize",					
			"target_service": "user.auth.quick.login",		
			"anti_phishing_key" : "",
			"exter_invoke_ip" : ""					
		};
		var sp = sortParams(params);
		var linkStr = createLinkStr(buildRequestPara(sp,aliConfig.quickLogin.secret));		
		return alipayGateway+"?"+linkStr;
	},
	alipay_getDirectPayUrl: function(order,callback){
		var params = {
			"service" : "create_direct_pay_by_user",
			"partner" : aliConfig.directPay.id.trim(),
			"payment_type"	: 1,
			"notify_url"	: aliConfig.directPay.notifyUrl,
			"return_url"	: aliConfig.directPay.returnUrl,
			"seller_email"	: aliConfig.directPay.sellerEmail,
			"out_trade_no"	: order.id,	//订单ID
			"subject"	: order.title,	//订单标题
			"total_fee"	: order.amount,	//金额
			"body"	: order.desc,	// 订单描述
			"show_url"	: order.purl,	//商品展示地址
			"anti_phishing_key"	: '',
			"exter_invoke_ip"	: '',
			"_input_charset"	: aliConfig.inputCharset
		}
		var sp = sortParams(params);
		var linkStr = createLinkStr(buildRequestPara(sp,aliConfig.directPay.secret));		
		callback(alipayGateway+"?"+linkStr);
	},
	alipay_getWapDirectPayUrl: function(order,callback){
		var req_data = '<direct_trade_create_req><notify_url>'+aliConfig.directPay.notifyUrl+'</notify_url><call_back_url>'+aliConfig.directPay.returnUrl+'</call_back_url><seller_account_name>'+aliConfig.directPay.sellerEmail+'</seller_account_name><out_trade_no>'+order.id+'</out_trade_no><subject>'+order.title+'</subject><total_fee>'+order.amount+'</total_fee><merchant_url>'+aliConfig.directPay.merchantUrl+'</merchant_url></direct_trade_create_req>';
		var params = {
			"service" : "alipay.wap.trade.create.direct",
			"partner" : aliConfig.directPay.id.trim(),
			"sec_id" : aliConfig.signType.trim(),
			"format"	: 'xml',
			"v"	: "2.0",
			"req_id"	: Date.now(),
			"req_data"	: req_data,
			"_input_charset"	: aliConfig.inputCharset
		}
		var spt = sortParams(params);
		// 远程请求获取token
		buildRequestHttp(spt,aliConfig.directPay.secret,function(replies){
			var newParams = parseResponse(replies)
				,request_token = newParams.request_token
				;

			req_data = '<auth_and_execute_req><request_token>' +request_token+ '</request_token></auth_and_execute_req>';				
			params.service = "alipay.wap.auth.authAndExecute";
			params.req_data = req_data;
			var sp = sortParams(params);
			var linkStr = createLinkStr(buildRequestPara(sp,aliConfig.directPay.secret));		
			callback(alipayGateway_wap+"?"+linkStr);
		});
	},
	// 验证return info的真实性
	verifyReturn: function(notify_obj,callback){
		if(!_.isEmpty(notify_obj)){
			var linkStr = createLinkStr(sortParams(notify_obj))
				,secret = aliConfig.directPay.secret
				;
			//生成签名结果
			var sign = crypto.md5(linkStr+secret);
			if (sign==notify_obj.sign) {
				callback(true);
			} else {
				callback(false);
			}
		}else{
			callback(false);
		}
	},
	/**
	 * 针对notify_url验证消息是否是支付宝发出的合法消息
	 * @callback 参数 验证结果
	 */
	verifyNotify: function(notify_obj,callback){
		if(!_.isEmpty(notify_obj)){	
			var notify_id = ''
				,sort_params = {}
				;	
			if(notify_obj['notify_data']){
				var doc = new DOMParser().parseFromString(notify_obj['notify_data'],'text/xml');
				notify_id = doc.documentElement.getElementsByTagName('notify_id')[0].lastChild.data;
				sort_params = sortNotifyPara(notify_obj);
			}else{
				notify_id = notify_obj.notify_id;
				sort_params = sortParams(notify_obj);
			}
			//获取支付宝远程服务器ATN结果（验证是否是支付宝发来的消息）
			var responseTxt = 'true';
			if (notify_id) {
				getResponse(notify_id,function(data){
					if(data){
						responseTxt = data.toLowerCase();
						var linkStr = createLinkStr(sort_params)
							,secret = aliConfig.directPay.secret
							;
						//生成签名结果
						var sign = crypto.md5(linkStr+secret);
						if(responseTxt=='true'&&sign==notify_obj.sign){
							callback(true)
						}else{
							callback(false)
						}
					}else{
						callback(false)
					}
				});
			}else{
				callback(false);
			}			

		}else{
			callback(false);
		}
		
	}

}
/*
* sort 手机端 notify para
*/
function sortNotifyPara(para) {
	var para_sort = {};
	para_sort['service'] = para['service'];
	para_sort['v'] = para['v'];
	para_sort['sec_id'] = para['sec_id'];
	para_sort['notify_data'] = para['notify_data'];
	return para_sort;
}
/**
* 对Obj的key进行排序
* @param params要排序的参数对象
* @return 排序好的参数对象
**/
function sortParams (params){
	var arr = []
		,sp = {};
	for(var i in params){
		if(i=='sign'||i=='sign_type')
			continue;
		if(params[i]!=''){
			arr.push(i);
		}
	}
	_.each(arr.sort(),function(ele){
		sp[ele] = params[ele];
	})
	return sp;
}

/**
 * 把对象的所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
 * @param params 需要拼接的数组
 * return 拼接完成以后的字符串
 */
function createLinkStr(params){
	var linkStr = '';
	_.map(params,function(val,key){
			linkStr += key+'='+val+'&';
		})
	linkStr = linkStr.slice(0,-1);
	return linkStr;
}
/**
 * 生成要请求给支付宝的参数对象
 * @param para_temp 请求前的参数对象
 * @return 要请求的参数对象
 */
function buildRequestPara(sort_params,secret) {
	var linkStr = createLinkStr(sort_params)
		,signType = aliConfig.signType.toUpperCase()
		;
	var sign = crypto.md5(linkStr+secret);
	sort_params.sign = sign;
	if(sort_params.service != 'alipay.wap.trade.create.direct' && sort_params.service != 'alipay.wap.auth.authAndExecute') {
		sort_params.sign_type = signType;
	}
	return sort_params
}

/**
 * 建立请求，以模拟远程HTTP的POST请求方式构造并获取支付宝的处理结果
 * @param sort_params 请求参数数组
 * @return 支付宝处理结果
 */
function buildRequestHttp(sort_params,secret,callback) {
	var result = '';
	//待请求参数数组字符串
	var request_data = buildRequestPara(sort_params,secret);
	var post_data = querystring.stringify(request_data);
	var options = {
		hostname:'wappaygw.alipay.com',
		path:'/service/rest.htm?_input_charset=utf-8',
		method:'POST',
		cert: fs.readFileSync(aliConfig.cacert),
		headers:{
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': post_data.length
		}
	}
	var req = https.request(options,function(res){
		res.setEncoding('utf8');
		res.on('data', function (chunk) {			
			var chunk = decodeURIComponent(chunk);
			callback(chunk);
		})
	});
	req.write(post_data);
	req.end();
	req.on('error', function(e) {
	  console.error(e);
	});
}

/**
 * 解析远程模拟提交后返回的信息
 * @param str 要解析的字符串
 * @return 解析结果
 */
function parseResponse(str) {
	var arr = str.split('&');
	var params = {};
	_.each(arr,function(val){
		var i = val.indexOf('=');
		params[val.substring(0,i)] = val.substring(i+1);
	});
	var doc = new DOMParser().parseFromString(params['res_data'],'text/xml');
	params.request_token = doc.documentElement.getElementsByTagName('request_token')[0].lastChild.data;
	return params;
}
/**
 * 获取远程服务器ATN结果,验证返回URL
 * @param notify_id 通知校验ID
 * @callback 参数 服务器ATN结果
 * 验证结果集：
 * invalid命令参数不对 出现这个错误，请检测返回处理中partner和key是否为空 
 * true 返回正确信息
 * false 请检查防火墙或者是服务器阻止端口问题以及验证时间是否超过一分钟
 */
function getResponse(notify_id,callback) {

	var transport = aliConfig.transport.toLowerCase()
		,partner = aliConfig.directPay.id.trim()
		,veryfy_url = ''
		;
	if(transport == 'https') {
		veryfy_url = https_verify_url;
	}else {
		veryfy_url = http_verify_url;
	}
	veryfy_url = veryfy_url+"partner="+partner+"&notify_id="+notify_id;
	https.get(veryfy_url,function(res){
		res.on('data',function(chunk){
			var chunk = decodeURIComponent(chunk);
			callback(chunk)
			return;
		})
	}).on('error', function(e) {
	  console.error(e);
	});;

}

function https_get(api,callback){
	https.get(api,function(res){
		res.setEncoding('utf8');
		res.on('data', function (chunk) {			
			var chunk = decodeURIComponent(chunk);
			callback(chunk);
			return;
		})
	}).on('error',function(e){
		console.error(e)
	})
}
