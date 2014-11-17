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
		},
		// 异步获取用户信息
		getProductInfo: function(){
			var url = '/product/getProductInfo';
			var id = $('#today-product-id').val();
			$.get(url,{id:id},function(data){
				if(data){
					var user = data.user;
					var product = data.product;

					if(product){
						// 销量
						if($('.p-salevolume label').length){
							$('.p-salevolume label span').text(product.salesVolume)
						}else if($('.p-salevolume strong').length){
							$('.p-salevolume strong').text(product.salesVolume)
						}
						// 库存
						if($('.p-store label').length){
							$('.p-store label span').text(product.count)
						}else if($('.p-store span').length){
							$('.p-store span').text(product.count)
						}
					}

					if(user){
						var htmlStr = '<a href="'+(user.role=='admin'?'admin/index':'/user/home')
								+'" class="f-username">'
								+ user.userName
								+'</a><a href="/logout" class="f-logout">退出登录</a>'
								;
						$('.user-home b').addClass('user-online');
						$('.footnav .left').html(htmlStr);
					}

				}
			})
		}
	}

	return TYG_utils;
});
