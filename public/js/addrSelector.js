
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
	    var val = $selector.val();
	    $cascading.empty();
	    for(var i in data){
	         if(val == data[i][1]){
				$cascading.append($('<option value="'+i+'">'+data[i][0]+'</otpn>'));
	         }
	    }
	    $cascading.prepend($('<option value="0">请选择</option>'));

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