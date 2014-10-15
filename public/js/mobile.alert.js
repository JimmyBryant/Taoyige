/**
*	mobile alert
*/
define(['jquery'],function ($) {
	var M_alert = function(opt){
		var defaults = {
			interval: 4*1000,
			locate:'bottom'
		};
		var _this = this			
			,str = '<div class="alert TYG-alert"><button type="button" class="close"><span aria-hidden="true">×</span></button><strong class="alert-mes"></strong></div>'
			;
		_this.option = $.extend(defaults,opt);
		_this.timer = null;
		_this.box_html = str;
	}
	$.extend(M_alert.prototype,{
		show:function(type,mes,callback){
			var _this = this;
			_this.alertBox&&_this.alertBox.remove();
			_this.alertBox = $(_this.box_html);
			$('body').append(_this.alertBox);
			if(_this.option.locate=='top'){
				_this.alertBox.css({'top':0,'bottom':'auto'});
			}			
			_this.alertBox.find('.close').on('click',function(){
				_this.hide();
			})
			this.alertBox.removeAttr('class').addClass('alert TYG-alert alert-'+type);
			this.alertBox.find('.alert-mes').empty().html(mes);
			this.alertBox.stop(true,true).fadeIn(function(){
				clearTimeout(_this.timer);
				_this.timer = setTimeout(function(){
					_this.hide();
					callback&&callback();
				},_this.option.interval)
			});
		},
		hide:function(){
			var _this = this;
			this.alertBox.stop(true,true).fadeOut(function(){
				_this.alertBox.remove();
			})
		}
	});
	return M_alert;
})