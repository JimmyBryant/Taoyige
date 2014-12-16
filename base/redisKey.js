module.exports = {	
	"userCount": "userCount",	//用户数量
	"orderCount" : "orderCount",	//订单数量
	"addressCount" : "addressCount",	//地址数量
	"productCount" : "productCount",	//商品数量
	"productSale" : "productSale",	//正在销售的商品
	"productReady":"H:product:ready", //准备销售的商品
	"productStore":"L:product:store",	//仓库中的商品
	"apps":"H:apps",	//移动端app信息
	"user" : "H:user",
	"order" : "H:order",
	"address" : "H:address",
	"product" : "H:product",
	"cart": "H:cart",
	"getUserField" : function(p,pid){
		return p+"-"+pid;
	},
	"getOrderField" : function(id){
		return id;
	},
	"getCartField": function(id){
		return id;
	},
	"getAddressField" : function(id){
		return id;
	},
	"getUserOrderKey" : function  (userID) {
		return "L:user:"+userID+":order";
	},
	"getStatusOrderKey": function(status){
		return "L:"+status+":order";
	},
	"getDateOrderKey": function(time){
		var date = new Date(time)
			,y = date.getFullYear().toString()
			,m = date.getMonth()+1
			,d = date.getDate()
			;
		var D = y+(m<10?'0'+m:date.getMonth())+(d<10?'0'+d:d);
		return "L:"+D+':order';
	},
	"getUserAddressKey" : function(userID){
		return "L:user:"+userID+":address"
	}
}