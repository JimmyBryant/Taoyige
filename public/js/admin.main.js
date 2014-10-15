//js for taoyige admin 
define(['jquery','jform'],function ($) {

	var removePreview = function(i){
		var $li = $('.thumb-preview-list li:eq('+i+')');
		$li.find('.thumb').remove();
		if($li.hasClass('thumb-main')){
			$li.html('<span class="text-info">商品主图</span>');
		}
		main.productImagesUrl[i] = '';	
	}
	var main = {
		productImagesUrl:[],
		productBannerUrl:'',
		uploadImage : function(){
			var $form = $('#form-product')
				,url = '/admin/product/uploadImage'
				;
			$form.ajaxSubmit({
				url:url,
				targe:'#productImage',
				dataType:'json',
				success: onSuccess
			})
			function onSuccess(result){
				$('#productImage').val('');
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
					var thumblist = $('.thumb-preview-list li');
					for(var i=0,len=thumblist.length;i<len;i++){
						var j = i;
						var $li = $(thumblist[i]);
						if(!$li.find('.thumb').length){
							$li.find('.text-info').remove();
							$('<a class="thumb"><img src="'+image.smallPath+'"/><span title="移除" class="remove-preview glyphicon glyphicon-remove"></span></a>').appendTo($li);
							$li.find('.remove-preview').on('click',function(){						
								removePreview(j);
							})
							main.productImagesUrl[i] = image.path
							return;
						}
					}
				}
			}
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

		}
	}
	// 商品编辑页面绑定移除商品图片事件
	$('.thumb-preview-list li').each(function(i,elem){
		var $li = $(elem)
			,j = i
			;
		$li.find('.remove-preview').on('click',function(){
			removePreview(j);
		})
	});
	// 提交表单的时候创建商品url element
	$('#btn-product-submit').on('click',function(){
		var $form = $('#form-product');
		if(main.productImagesUrl.length){
			var urlStr = main.productImagesUrl.join(',');
			$('#normalImageUrl').val(urlStr);
		}
		$('#bannerImageUrl').val(main.productBannerUrl)
	})
	return main;
})