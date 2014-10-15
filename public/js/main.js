/**
*	main js
*/	

define(['jquery','M_alert'],function($,M_alert){

	// 返回上一页
	$('.user-header .h-back').on('click',function(){
		history.go(-1);
	});

	// 提交订单
	$('.btn-submit').on('click',function(){
		$(this).parents('form').submit();
	});
	
	// 购买
	$('.btn-shopping-now').on('click',function(){
		var $btn = $(this);
		var id = $('#today-product-id').val();
		if(id&&!$btn.hasClass('btn-disable')){
			var malert = new M_alert()
				,mes = ''
				;
			// 添加到购物车
			$.get('/purchase/addto_cart?id='+id,function(data){
				if(data){
					if(data.err){
						if(data.err==1){
							malert.show('danger','商品不存在');
						}else if(data.err==2){
							malert.show('danger','您还有未支付的订单待处理<a href="/order/unpaid">查看订单</a>');
						}else if(data.err==3){
							malert.show('danger','您已购买了该商品，每人限购一次');
						}else if(data.err==4){
							malert.show('danger','管理员账户不能购买商品');
						}else if(data.err==5){
							malert.show('danger','该商品还未开放购买');
						}else if(data.err==6){
							malert.show('danger','抱歉,该商品已经售罄');							
						}						
					}else{
						if (typeof data=='object'){
							location.href="/order/create";							
						}else{
							location.href = "/login";
						}
					}
				}
			})
		}
	});

	var TYG_utils = {
		// 秒倒计时
		secondTick: function(tick,callback){
			var timer = setInterval(function(){
				var v = parseInt(tick.text());
				if(v==0){
					clearInterval(timer);
					callback&&callback();
					return;
				}
				tick.text(v-1);
			},1000);
		}
	}

	return TYG_utils;
});
