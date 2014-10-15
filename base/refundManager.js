
//退款对象
var refund = {
	id:'',
	productID:'',
	orderID:'',
	description:'',
	amount:'',
	timestamp:'',
	operation:[],	//[{content:'',timestamp:''}]
	status:''	//"1"审核中;"2"退款中;"3"退款成功
}