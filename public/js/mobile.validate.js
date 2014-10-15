/**
*	mobile.validate.js
*/
define(['jquery','M_alert'],function ($,M_alert) {
	var M_validate = function(form){
		this.form = form;		
		var regs = {
			'addr-name':/^[\u2E80-\u9FFF]{2,6}$/,
			'addr-mobile':/^(13[0-9]|15[012356789]|18[0-9]|14[57]|17[6-8])[0-9]{8}$/,
			'addr-postcode':/^[1-9]\d{5}$/
		};
		var errMessage = {
			'addr-name': ['请填写收货人姓名','请填写2~6位中文姓名'],
			'addr-mobile': ['手机号码不能为空','手机号码格式错误'],
			'addr-province': ['请选择省份'],
			'addr-city':['请选择城市'],
			'addr-county':['请选择区县'],
			'addr-postcode':['邮编不能为空','邮编格式错误'],
			'addr-details':['请输入详细地址']
		};
		form.each(function(i,elem){
			var $form = $(elem)
				,form_elems = $('[data-validate]',$form)
				,alr = new M_alert({
					locate:'top'
				})
				;
			if(form_elems.length){
				$form.on('submit',function(){
					var mes = checkform($form);
					if(mes!==true){
						alr.show('danger',mes);
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
					return mes[0]||'';
				}else if(reg&&!reg.test(val)){	//验证格式是否正确	
					$elem.focus();			
					return mes[1]||'';
				}

			}
			return true;
		}

	}

	return M_validate;
})