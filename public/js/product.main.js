
define(['jquery','main','swiper','lazy'],function($,main){
	var mySwiper = $('.product-swiper').swiper({		    
	    mode:'horizontal',
	    loop: true,
	    pagination:'.swiper-pagination',
	    paginationClickable:true				    
	});
	$('img.lazy-img').lazyload({
    	effect : "fadeIn"
	});
	// 异步获取用户信息
	main.getProductInfo();
})