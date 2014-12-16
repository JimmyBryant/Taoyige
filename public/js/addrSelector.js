
define(['jquery','addressData'],function ($,data) {

	var addrSelector = function(province,city,county){
        this.province = province;
        this.city = city;
        this.county = county;
        var _this = this
        	,data = this.addressData
        	,province_selected = province.data('selected')||''
            ;
        if(province.length <2){
            for(var i in data){
                if(data[i][1] == "1"){
                    province.append($('<option '+(province_selected==i?'selected':'')+' value="'+i+'">'+data[i][0]+'</otpn>'));
                }
            }
        }
        province.on('change',function(){
            _this.addressChange(province,city);
            _this.addressChange(city,county);
        });
        city.on('change',function(){
            _this.addressChange(city,county);
        });
    }
	addrSelector.prototype.addressChange = function($selector,$cascading){	    
	    var val = parseInt($selector.val())
            ,n = 0
            ,$opt = null
            ;
	    $cascading.empty();
        $cascading.prepend($('<option value="0">请选择</option>'));
	    for(var i in data){
            if(val == data[i][1]){
                $opt = $('<option value="'+i+'">'+data[i][0]+'</otpn>');
                $cascading.append($opt);
                n++;                
            }
	    }
        // 当上一级有值且目前的选项不存在时候才显示空        
        if(val&&n==0){
            $opt = $('<option value="-1">无</option>');
            $cascading.html($opt);
            n++;
        }
        if(n==1&&$opt){
            $opt.attr('selected',true)
        }	    
	}
    addrSelector.prototype.select = function(p,c,co){
        var _this = this
            ,province = _this.province
            ,city = _this.city
            ,county = _this.county
            ;
        province.find('option[value='+p+']').attr('selected',true);
        this.addressChange(province,city);
        city.find('option[value='+c+']').attr('selected',true);
        this.addressChange(city,county);
        county.find('option[value='+co+']').attr('selected',true);
    }
	
	addrSelector.prototype.addressData = data;

	return addrSelector;
});