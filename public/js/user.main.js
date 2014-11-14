define(['jquery','addrSelctor','M_validate','M_alert','modal'],function($,addrSelector,validate,M_alert){
	var alr = new M_alert();
	// 用于异步加载内容的Loader对象
	var contentLoader = function (opts) {
		var config = {
			url:'',
			container:$('body'),
			start:0,
			length:10,
			success:null
		}

		var _ = this;
		_.option = $.extend(config,opts)
		_.status = null;	//加载状态

		$(window).on('scroll',function(){			
			var $w = $(window)
				,st = $w.scrollTop()
				,bh = $('body').height()
				,wh = $w.height()
				;
			var loadStatus = contentLoader.loadStatus;				
			if(st+wh>=bh){	//页面滚动到底端
				if(!_.status||_.status==loadStatus.complete||_.status==loadStatus.error){
					_.changeStatus(loadStatus.ready);
					_.load();
				}
			}
		})
	}
	contentLoader.loadStatus = {
		ready:'加载更多',
		loading:'正在加载...',
		error:'加载失败',
		complete:'加载完成',
		nomore:'没有更多内容'
	}
	contentLoader.prototype.changeStatus = function(status){
		var _ = this;
		var loadStatus = contentLoader.loadStatus;
		// 没有状态栏则创建
		if(!_.statusbar){
			_.statusbar = $('<p id="loading-statusbar"><i></i><span></span></p>');
			_.statusbar.appendTo(_.option.container)
		}
		_.status = status;
		_.statusbar.find('span').text(status);
		//显示loading gif 图标
		if(status == loadStatus.loading){
			_.statusbar.find('i').addClass('show');
		}else{
			_.statusbar.find('i').hasClass('show')&&_.statusbar.find('i').removeClass('show');
		}
		// 加载完成移除状态栏
		if(status==loadStatus.complete){
			_.statusbar.remove();
			_.statusbar = null;
		}
	}

	contentLoader.prototype.load = function(){
		var _ = this
			,opt = _.option
			,loadStatus = contentLoader.loadStatus
			;
		// 只有在ready状态下才能开始请求内容
		if(_.status == loadStatus.ready){
			_.xhr = $.ajax({
				url:opt.url,
				data:{
					start:opt.start
				},
				success:function(data){					
					if(!data||!data.length){
						_.changeStatus(loadStatus.nomore);
					}else{
						_.changeStatus(loadStatus.complete);
					}
					opt.start += opt.length;
					opt.success&&opt.success(data);
				},
				error: function(){	//加载失败
					_.xhr.abort();
					_.changeStatus(loadStatus.error)
				}

			});
			_.changeStatus(loadStatus.loading);
		}
	}

	var main = {
		contentLoader: contentLoader,
		operating: function(){
		
			$('.addr-oper .oper-delete').on('click',function(){
				var $this = $(this)
					,url = this.href
					;
				var modal = $('.modal').modal();
				$('.modal .btn-primary').one('click',function(){
					$.get(url,function(data){
						if(data){
							alr.show('success','收货地址删除成功')
							$this.parents('.address-box').fadeOut();
						}else{
							alr.show('danger','收货地址删除失败')
						}
						modal.modal('hide');
					})
				})
				return false;
			});
		},
		selectAddress: function(){
			// 选择收货地址
			if($('.address-list').length){
				$('.address-box').on('click',function(){
					var $this = $(this);
					if(!$this.hasClass('address-selected')){
						$('.address-selected').removeClass('address-selected').find('.glyphicon').remove();
						$this.addClass('address-selected').append($('<span class="glyphicon glyphicon-ok">'));
					}
					var url = '/user/select_address?id='+$this.data('id');
					location.href=url;
				});
				$('.oper-item').on('click',function(event){
					event.stopPropagation();
				})
			}
		},
		addressForm: function(){
			new addrSelector($('#province'),$('#city'),$('#county'));
			new validate($('#form-address'));
		},
		// 设置home页面的order badge
		setOrderBadge: function(){
			var url = '/order/uncomplete';
			$.get(url,function(data){
				if(data&&data.orderlist){
					var unpaidCount = 0
						,paidCount = 0
						;
					$.each(data.orderlist,function(i,val){
						if(val.status==1){
							unpaidCount++;
						}else{
							paidCount++;
						}
					})
					unpaidCount&&$('<sub class="badge badge-unpaid">'+unpaidCount+'</sub>').appendTo($('.shortcut-needpay'))
					paidCount&&$('<sub class="badge badge-paid">'+paidCount+'</sub>').appendTo($('.shortcut-needcheck'))
				}
			})
		},
		// 验收订单
		checkOder: function(){
			var url = '/order/checkOrder';
			$('.order-info .btn-check').on('click',function(){
				var $this = $(this)
					,id = $this.data('id')
					;
				if($this.attr('disabled')!='disabled'){
					$.get(url,{id:id},function(data){
						if(data){
							$this.attr('disabled','disabled');
							$this.parents('.box:eq(0)').fadeOut();							
						}
					})
				}

			})
		},
		timeTick: function(){
			var $labels = $('.time-tick');
			var parseTime=function(t){
				return t<10?'0'+t:t;
			}
			$labels.each(function(i,elem){
				var $label = $(elem)									
					,id = $label.data('orderid')
					,url = '/order/autoClose'
					;
				function tick(){
					setTimeout(function(){
						var expires = $label.data('expires')
						    ,time = expires-1000
						    ;
						$label.data('expires',time);
						if(time>0){
							var minutes = Math.floor(time/60000)
								,seconds = Math.ceil((time%60000)/1000)
								;
							$label.find('em').text(parseTime(minutes)+':'+parseTime(seconds));
							tick();
						}else{
							$label.find('em').text('00:00');
							// 过期关闭订单
							if(id){
								$.get(url+'?id='+id,function(result){
									if(result){
										$label.parents('.panel:eq(0)').fadeOut();
									}
								})
							}
						}
					},1000)
				}
				tick();
			});

		}
	}

	return main;
})