//module required

var _ = require('underscore')
	,appInfoManager = require('../base/appInfoManager')
	;

var method = '';

var controller = {
	// 获取应用版本信息
	android: function(req,res,next){
		appInfoManager.getAndroidAppInfo(function(err,replies){
			var info = {};
			if(replies){
				var app = replies;
				info = {
					"versionCode":app.versionCode,
					"versionName":app.versionName,
					"downloadUrl":app.downloadUrl,
					"updateLog":app.updateLog
				}
			}
			res.send(info)			
		})
	}

}

var imageController = {
	android: function(req,res,next){
		appInfoManager.getAndroidAppInfo(function(err,replies){
			var info = {};
			if(replies){
				var app = replies;
				var list = app.imglist.split(',')
					,imglist = []
					;
				list.forEach(function(val,i){
					imglist.push({"coverImgUrl":val})
				});
				info = {
					"imglist":imglist,
					"startDate":app.startDate,
					"endDate":app.endDate,
					"update":app.update
				}
			}
			res.send(info)			
		})		
	}
}

module.exports.index = function (req,res,next) {
	method = req.method.toLowerCase();
	var action = req.params.action
		;
	if(action&&controller[action]){
		controller[action](req,res,next);
	}else{
		next();
	}
};	

module.exports.images = function (req,res,next) {
	method = req.method.toLowerCase();
	var action = req.params.action
		;
	if(action&&imageController[action]){
		imageController[action](req,res,next);
	}else{
		next();
	}
};	