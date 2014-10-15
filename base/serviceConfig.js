/**
*	该文件配置用于第三方登录已经支付
*
*/
var config = require('../config');
var path = require('path');
module.exports = {
	//支付宝的配置
	'alipay':{
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
			'merchantUrl':config.host+'/purchase/backMerchant',
			'sellerEmail':'support@instreet.cn'
		},		
		'signType':'MD5',
		'transport':'https',
		'inputCharset':'utf-8',		
		'cacert':path.join(__dirname,'..')+'/cacert/alipay/cacert.pem'
	},
	//微信的配置
	'weixin':{
		'id':'',
		'key':''
	}

}