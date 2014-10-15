// require denpendency modules

var productManager = require('../base/productManager')
	,_ = require('underscore')
	;

var method = ''
	,user = null
	;

var actions = {
	details: function(req,res){
		if(method=='get'){
			var m = req.method
				,user = req.session.userInfo
				,id = req.query.id
				;
			productManager.getProduct(id,function(err,replies){
				var product = null;
				if(replies){
					product = JSON.parse(replies)
				}
				res.render('product/product_details',{user:user,product:product})
			});
		}
	}
}

module.exports.index = function(req,res,next){
	var action = req.params.action
		;
	method = req.method.toLowerCase();		
	user = req.session.userInfo;
	if(action&&actions[action]){
		actions[action](req,res);		
	}else{
		next();
	}

};