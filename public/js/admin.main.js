//js for taoyige admin 
define(['jquery','jform'],function ($) {


	var main = {
		productImagesUrl:[],
		productDetailsImagesUrl:[],
		productBannerUrl:'',
		customExpressInfo:[],	//自定义快递信息
		uploadImage : function(){
			var $form = $('#form-product')
				,url = '/admin/product/uploadImage'
				;
			$form.ajaxSubmit({
				url:url,
				targe:'#productImage',
				dataType:'json',
				success: function(result){
					onUploadSuccess(1,result)
				}
			})
		},
		uploadDetails: function(){
			var $form = $('#form-product')
				,url = '/admin/product/uploadDetails'
				;
			$form.ajaxSubmit({
				url:url,
				targe:'#productDetailsImage',
				dataType:'json',
				success:  function(result){
					onUploadSuccess(2,result)
				}
			})
		},
		uploadBanner: function(){
			var $form = $('#form-product')
				,url = '/admin/product/uploadBanner'
				;
			$form.ajaxSubmit({
				url:url,
				targe:'#productBanner',
				dataType:'json',
				success: function(result){
					$('#productBanner').val('');
					if(!result){
						alert('图片上传失败')
					}else if(result.err){
						if(result.err==2){
							alert('图片类型错误，仅限jpg,jpeg,png')						
						}else if(result.err==3){
							alert('图片大小不能超过50K')
						}
					}else{
						var src  = result.data;
						main.productBannerUrl = src;
						$('.banner-preview').empty().append($('<a href="javascript:;" class="banner"><img src="'+src+'"/></a>'));
					}
				}
			})
		},
		validate: function(form){	
			var regs = {
				'product-price':/^\d{1,8}(\.\d{1,2}|\d+)?$/,
				'product-oriPrice':/^\d{1,8}(\.\d{1,2}|\d+)?$/,
				'product-count':/[1-9]\d*/
			};
			var errMessage = {
				'product-title': ['商品标题不能为空','请填写2~6位中文姓名'],
				'product-price': ['商品价格不能为空','商品价格必须为大于0的数字'],
				'product-oriPrice': ['商品原价不能为空','商品价格必须为大于0的数字'],
				'product-count':['商品数量不能为空','商品数量必须为大于0的整数']
			};
			form.each(function(i,elem){
				var $form = $(elem)
					,form_elems = $('[data-validate]',$form)
					;
				if(form_elems.length){
					$form.on('submit',function(){
						$('.has-error',$form).removeClass('has-error');
						var mes = checkform($form);
						if(mes!==true){
							alert(mes);
							return false;
						}else if(parseFloat($('#price').val())>parseFloat($('#oriPrice').val())){
							mes = '商品售价不能大于商品原价';
							alert(mes);
							return false;
						}else if(!main.productImagesUrl.length){
							mes = '还没上传商品图片呢';
							alert(mes);
							return false;
						}
						return true;						
					});
				}				
			});

			function checkform(form){
				var form_elems = $('[data-validate]',form)
					;
				for(var i=0,len=form_elems.length;i<len;i++){
						
					var $elem = $(form_elems[i])
						,val = $elem.val().trim()
						,input_type = $elem.data('validate')
						,reg = regs[input_type]
						,mes = errMessage[input_type]||[]
						;
					if(!val||val==0||val==''){	// 验证是否为空
						$elem.focus();
						$elem.parents('.form-group').addClass('has-error');
						return mes[0]||'';
					}else if(reg&&!reg.test(val)){	//验证格式是否正确	
						$elem.focus();			
						return mes[1]||'';
					}

				}
				return true;
			}

		},
		timeTick: function(){
			var $labels = $('.time-tick');
			var parseTime=function(t){
				return t<10?'0'+t:t;
			}
			$labels.each(function(i,elem){
				var $label = $(elem)									
					,id = $label.data('orderid')
					,url = '/admin/orders/close'
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
							$label.addClass('time-tick-danger').find('em').text('00:00');
							// 过期关闭订单
							if(id){
								$.get(url+'?id='+id,function(result){
									if(result){
										$label.parents('tr:eq(0)').fadeOut();
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

	// 删除预览图
	var removePreview = function($li){
		$li.find('.thumb').remove();
		if($li.hasClass('thumb-main')){
			$li.html('<span class="text-info">商品主图</span>');
		}
		var i = $li.data('index');
		if($li.parents('.form-group:eq(0)').attr('id')=='details-image-group'){
			main.productDetailsImagesUrl[i] = '';
		}else{
			main.productImagesUrl[i] = '';
		}
	}

	// 图片上传成功
	function onUploadSuccess(type,result){
		if(type==1){
			var $container = $('#image-group');
		}else{
			var $container = $('#details-image-group');
		}
		$container.find('input[type="file"]').val('');
		if(!result){
			alert('图片上传失败')
		}else if(result.err){
			var err = result.err
				,mes = ''
				;
			switch(err.toString()){
				case '1':mes = '图片尺寸必须大于640x640';break;
				case '2':mes = '图片类型错误，仅限jpg,jpeg,png';break;
				case '3':mes = '图片大小不能超过50K';break;
				default:mes = '图片上传失败'
			}
			alert(mes)
		}else{
			var image  = result.data;
			var $thumb_container = $('.thumb-preview-list',$container);
			var thumblist = $('li',$thumb_container);
			for(var i=0,len=thumblist.length;i<len;i++){
				var j = i;
				var $li = $(thumblist[i]);
				if(!$li.find('.thumb').length){
					$li.find('.text-info').remove();
					$('<a class="thumb"><img src="'+image.path+'"/><span title="移除" class="remove-preview glyphicon glyphicon-remove"></span></a>').appendTo($li);
					if(type==1){
						main.productImagesUrl[i] = image.path
					}else{
						main.productDetailsImagesUrl[i] = image.path
					}
					
					return;
				}
			}
		}
	}
	
	if($('.thumb-preview-list').length){
		// 删除预览的小图
		$(document).on('click','.thumb-preview-list>li .remove-preview',function(){
			
			// 商品编辑页面绑定移除商品图片事件
			var $this = $(this)
				,$li = $(this).parents('li:eq(0)')
				,i = $li.data('index')
				;
			removePreview($li)
		})

	}

	// 添加自定义快递信息
	$('.add-custom-info').on('click',function(){
		var context = $('#express-context').val()
			,time = $('#express-time').val()
			;
		if(context&&time){
			var html = '<dd><label> <span class="text">'+context+'</span> <em class="time">'+time+'</em> </label> <div class="operate-tool"><a href="javascript:;" title="编辑" class="glyphicon glyphicon-pencil btn-edit"></a> <a href="javascript:;" title="删除" class="glyphicon glyphicon-remove btn-delete"></a> </div> </dd>';
			$('.custom-info-list').prepend(html);
			main.customExpressInfo.unshift({context:context,time:time})
		}
	})

	if($('.custom-info-list').length){
		//删除自定义快递信息
		$(document).on('click','.custom-info-list .btn-delete',function(){
			if(confirm("确认删除该条快递信息？")){
				var $this = $(this)
					,$dd = $this.parents('dd:eq(0)')
					;
				
				for(var i=0;i<$('.custom-info-list dd').length;i++){
					console.log($('.custom-info-list dd')[i]==$dd[0])
					if($('.custom-info-list dd')[i]==$dd[0]){
						$dd.remove();
						main.customExpressInfo.splice(i,1);
					}
				}										
			}			
		});
		//编辑自定义快递信息
		$(document).on('click','.custom-info-list .btn-edit',function(){
			var $this = $(this)
				,$dd = $this.parents('dd:eq(0)')
				;
			if(!$dd.hasClass('editing')){
				$dd.addClass('editing');
				$('.operate-tool',$dd).hide();	//隐藏编辑、删除按钮
				$('label',$dd).hide()
				$('.edit-box',$dd).show();	//显示编辑框
			}

		});
		// 取消编辑
		$(document).on('click','.custom-info-list .btn-cancel',function(){
			var $this = $(this)
				,$dd = $this.parents('dd:eq(0)')
				;			
			$dd.removeClass('editing');
			$('.edit-box',$dd).hide();	//隐藏编辑框			
			$('label',$dd).show()			
		});
		// 确认编辑
		$(document).on('click','.custom-info-list .btn-ok',function(){
			var $this = $(this)
				,$dd = $this.parents('dd:eq(0)')
				,context = $('.val1',$dd).val()
				,time = $('.val2',$dd).val()
				;			

			// 更新快递信息
			if(context&&time){
				$dd.removeClass('editing');
				$('.edit-box',$dd).hide();	//隐藏编辑框
				$('.text',$dd).text(context);
				$('.time',$dd).text(time);
				$('label',$dd).show();
				for(var i=0;i<$('.custom-info-list dd').length;i++){
					if($('.custom-info-list dd')[i]==$dd[0]){
						main.customExpressInfo[i] = {
							context:context,
							time:time
						}
					}
				}
			}								
		});				
		$(document).on('mouseenter mouseleave','.custom-info-list dd',function(e){
			var $this = $(this);
			if(e.type=='mouseenter'){
				if(!$this.hasClass('editing')){
					$(this).find('.operate-tool').show();				
				}
			}else{
				$(this).find('.operate-tool').hide();
			}
		})

	}

	//提交快递表单的时候创建自定义快递信息
	$('#btn-express-submit').on('click',function(){
		if(main.customExpressInfo.length){
			var contextArr = []
				,timeArr = []
				;
	
			for(var i=0;i<main.customExpressInfo.length;i++){
				contextArr.push(main.customExpressInfo[i].context);
				timeArr.push(main.customExpressInfo[i].time)
			}			
			$('#customExpressContext').val(contextArr.join('|'));
			$('#customExpressTime').val(timeArr.join('|'));
		}
	});

	// 提交商品表单的时候创建商品url element
	$('#btn-product-submit').on('click',function(){
		var $form = $('#form-product');
		if(main.productImagesUrl.length){
			for(var i=0;i<main.productImagesUrl.length;i++){
				if(!main.productImagesUrl[i])
					main.productImagesUrl.splice(i,1);
			}
			var urlStr = main.productImagesUrl.join(',');
			$('#normalImageUrl').val(urlStr);
		}
		if(main.productDetailsImagesUrl.length){
			for(var i=0;i<main.productDetailsImagesUrl.length;i++){
				if(!main.productDetailsImagesUrl[i])
					main.productDetailsImagesUrl.splice(i,1);
			}
			var urlStr = main.productDetailsImagesUrl.join(',');
			$('#detailsImageUrl').val(urlStr);			
		}
		$('#bannerImageUrl').val(main.productBannerUrl)
	});
	return main;
})