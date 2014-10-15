define(['jquery','addrSelctor','M_validate','M_alert','modal'],function($,addrSelector,validate,M_alert){
	var alr = new M_alert();
	var main = {
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