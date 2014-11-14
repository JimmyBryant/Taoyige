/**
*	该文件配置用于第三方登录已经支付
*
*/
var config = require('../config');
var path = require('path');
module.exports = {
	//支付宝的配置
	'alipay':{
		'pid':1,
		'quickLogin':{
			'id':'2088101753602016',
			'secret':'mqx7kwp7tu0tmed7isf2ybp39dfkm4lz',
			'returnUrl':config.host+'/loginReturn'
		},
		'directPay':{
			'id':'2088801569286184',
			'secret':'n11n6oi0e3i1f8wv100p5vwp5e3p9yn9',
			'notifyUrl':config.host+'/purchase/pay_notify',
			'returnUrl':config.host+'/purchase/pay_return',
			'merchantUrl':config.host+'/purchase/backto_merchant',
			'sellerEmail':'support@instreet.cn'
		},		
		'signType':'MD5',
		'transport':'https',
		'inputCharset':'utf-8',		
		'cacert':path.join(__dirname,'..')+'/cacert/alipay/cacert.pem'
	},
	// 新浪微博的配置
	'weibo':{
		'pid':2,
		'quickLogin':{
			'id':'2503694085',
			'secret':'5890b48d9b9d8488ca7c14de033fd63b',
			'returnUrl':config.host+'/loginReturn'
		},		
	},
	// 腾讯QQ的配置
	'qq':{
		'pid':3,
		'quickLogin':{
			'id':101165844,
			'secret':'43de3f407c7be69a367d3b6a265d67a6',
			'returnUrl':config.host+'/loginReturn'
		}
	}

}