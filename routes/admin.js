
var orderManager = require('../base/orderManager')
	,orderStatus = orderManager.orderStatus
	,productManager = require('../base/productManager')
	,mapper = require('xto').mapper
	,gm = require('gm')
	,node_path = require('path')
	,fs = require('fs')
	,_ = require('underscore')
	;

var method = ''
	,path = ''
	,user = null
	;

var minWidth = minHeight = 320
	,maxSize = 1024*500
	,lw = lh = 640
	,w = h = 320
	,sw = sh = 160
	;

var imageError = {
	"sizeLimit":1,
	"typeError":2,
	"sizeSmall":3
}

var admin = {
	login: function(req,res){
		if(method == 'get'){
			res.render('admin/login')
		}else if(method == 'post'){			
			var params = req.body
				,username = params.username
				,psd = params.password
				,administrators = global.appConfig.administrators
				;
			if(username&&psd){
				var admin = null;
				for(var i = 0,len=administrators.length;i<len;i++){
					var user = administrators[i];
					if(user.name==username){
						if(user.password==psd){
							admin = user;
						}
					}
					continue;
				}
				
				if(admin){
					req.session.userInfo = {
						userName: admin.name,
						role:'admin'
					}
					if(req.session.referrer){
						var ref = req.session.referrer;
						req.session.referrer = '';
						res.redirect(ref);
					}else{
						res.redirect('/admin/index')
					}					
				}else{
					res.render('admin/login')
				}
			}else{
				res.render('admin/login')
			}	
		}
	},
	logout: function(req,res){
		if(method=='get'){
			req.session.userInfo = null;
			res.redirect('/admin/login');
		}
	},
	index: function(req,res){
		res.redirect('/admin/orders/index')
	}
}

var order = {	
	// 订单管理首页 
	index: function(req,res){
		if(method=='get'){
			getOrderlist('paid',req,res);
		}
	},
	delivered: function(req,res){
		if(method=='get'){
			getOrderlist('delivered',req,res);
		}
	},
	//未付款订单
	unpaid: function(req,res){
		if(method=='get'){
			getOrderlist('unpaid',req,res);
		}
	},
	//退款中订单
	refund: function(req,res){
		if(method=='get'){
			getOrderlist('refund',req,res);
		}
	},
	//退款完成的订单
	refund_success: function(req,res){
		if(method=='get'){
			getOrderlist('refundSuccess',req,res);
		}
	},
	// 填写快递信息
	add_express: function(req,res){
		var order=null;
		if(method=='get'){
			var id = req.query.id||'';			
			if(id){
				orderManager.getOrderDetails(id,function(err,replies){
					var order = replies;
					res.render('admin/express_add',{order:order,mapper:mapper});
				})
			}else{
				res.render('admin/express_add',{order:order,mapper:mapper,user:user});
			}
		}else if(method=='post'){
			var id = req.body.id
				,expressCompany = req.body.expressCompany
				,expressNumber = req.body.expressNumber.trim()
				;
			if(id&&expressCompany&&expressNumber){
				orderManager.deliverOrder(id,expressCompany,expressNumber,function(err,replies){
					if(replies){
						res.send('发货成功')
					}else{
						res.send('发货失败')
					}					
				})
			}else{
				res.redirect('/admin/add_express?id='+id);
			}
		}
		
	},
	// 修改快递信息
	edit_express: function(req,res){
		var order=null;
		if(method=='get'){
			var id = req.query.id||'';			
			if(id){
				orderManager.getOrderDetails(id,function(err,replies){
					var order = replies;
					res.render('admin/express_edit',{order:order,mapper:mapper,user:user});
				})
			}else{
				res.render('admin/express_edit',{order:order,mapper:mapper,user:user});
			}
		}else if(method=='post'){
			var id = req.body.id
				,expressCompany = req.body.expressCompany
				,expressNumber = req.body.expressNumber.trim()
				;
			if(id&&expressCompany&&expressNumber){
				orderManager.setExpressInfo(id,expressCompany,expressNumber,function(err,replies){
					res.redirect('/admin/orders/edit_express?id='+id);					
				})
			}else{
				res.redirect('/admin/orders/edit_express?id='+id);
			}
		}
	},
	// 修改订单金额
	edit_price: function(req,res){
		var order=null;
		if(method=='get'){
			var id = req.query.id||'';			
			if(id){
				orderManager.getOrderDetails(id,function(err,replies){
					var order = replies;
					res.render('admin/price_edit',{order:order,user:user});
				})
			}else{
				res.render('admin/price_edit',{order:order,user:user});
			}
		}else if(method=='post'){
			var id = req.body.id
				,newPrice = parseFloat(req.body.newPrice.trim())
				;
			if(id&&newPrice!==NaN){
				orderManager.setAmount(id,newPrice,function(err,replies){
					console.log(err,replies)
					res.redirect('/admin/orders/edit_price?id='+id);					
				})
			}else{
				res.redirect('/admin/orders/edit_price?id='+id);
			}
		}
	},
	// 设置订单状态为退款中
	setRefund: function(req,res){
		if(method=='get'){
			var id = req.query.id;
			orderManager.refund(id,function(err,replies){
				if(err){
					res.send('设置退款状态失败')
				}else{
					res.send('订单成功设置为办理退款中')
				}
			})
		}
	},
	// 设置订单状态为退款成功
	setRefundSuccess: function(req,res){
		if(method=='get'){
			var id = req.query.id;
			orderManager.refundSuccess(id,function(err,replies){
				if(err){
					res.send('设置退款成功状态失败')
				}else{
					res.send('订单成功设置为办理退款成功')
				}
			})
		}
	},
	// 关闭订单
	close: function(req,res){
		var id = req.query.id;
		orderManager.closeOrder(id,function(err,replies){
			if(err){
				res.send('订单关闭失败')
			}else{
				res.send('订单已经关闭')
			}			
		});
	},
	// 设置订单为已付款状态
	pay: function(req,res){
		var id = req.query.id
			,notice = '';
		orderManager.payOrder(id,notice,function(err,replies){
			res.send('付款成功'+id+replies)
		});
	}
}

function getOrderlist(type,req,res){
	var type = type
		,page = parseInt(req.query.page)||1
		,length = parseInt(req.query.len)||20
		,start = (page-1)*length
		;

	orderManager.lengthOfStatusOrder(orderStatus[type],function(err,replies){
		var pageCount = 0;	//页码总数
		if(replies){
			pageCount = Math.ceil(parseInt(replies)/length)
		}
		var pager = {
			pageNum: page,
			pageLength: length,
			pageCount: pageCount,
			url:'/admin/orders/'+type+'?'
		}		
		orderManager.getOrderByStatus(orderStatus[type],start,length,function(err,replies){
			var orderlist = [];
			if(replies){
				orderlist=replies;
			}
			res.render('admin/orders_'+type,{orderlist:orderlist,orderStatus:orderStatus,pager:pager,user:user})
		});
	})
}

// 商品管理
var product = {
	// 商品管理首页
	index:function(req,res){
		if(method=='get'){
			productManager.getProductOnSale(function(err,replies){
				var productlist = [];
				if(replies){
					productlist.push(replies);
				}
				res.render('admin/product_index',{productlist:productlist,user:user})
			});				
		}	
	},
	// 排期销售的商品
	ready: function(req,res){
		if(method=='get'){
			productManager.getProductReadySale(function(err,replies){
				var productlist = [];
				if(replies){
					productlist = replies;
				}
				res.render('admin/product_ready',{productlist:productlist,user:user})
			});	
		}
	},
	// 仓库中的商品
	store: function(req,res){
		if(method=='get'){
			var page = parseInt(req.query.page)||1
				,length = parseInt(req.query.len)||20
				,start = (page-1)*length
				;
			productManager.getStoreCount(function(err,replies){
				var pageCount = 0;
				if(replies){
					pageCount = Math.ceil(parseInt(replies)/length)
				}
				var pager = {
					pageNum: page,
					pageLength: length,
					pageCount: pageCount,
					url:'/admin/product/store?'
				}
				productManager.getProductStoring(start,length,function(err,replies){
					var productlist = [];
					if(replies){
						productlist = replies;
					}
					res.render('admin/product_store',{productlist:productlist,user:user,pager:pager})
				});				
			})					
		}
	},
	// 发布商品
	add: function (req,res) {
		if(method=='get'){
			getIdleArr(function(replies){
				var idleArr = replies;
				res.render('admin/product_add',{idleArr:idleArr})
			});			
		}else if(method=='post'){
			postProduct(req,res)
		}
	},
	edit: function(req,res){
		if(method=='get'){
			var id = req.query.id;
			var product = null;
			if(id){
				productManager.getProduct(id,function(err,replies){
					if(replies){
						product = JSON.parse(replies);
					}
					// 获取还未排期的日子
					getIdleArr(function(replies){
						var idleArr = replies;
						if(product&&product.saleStartTime){
							var d = new Date(product.saleStartTime).getDate()-new Date().getDate();
							!_.contains(idleArr,d)&&idleArr.push(d);
						}
						res.render('admin/product_edit',{user:user,product:product,idleArr:idleArr});
					})					
				})
			}else{
				res.render('admin/product_edit',{user:user,product:product})
			}
		}else if(method=='post'){
			postProduct(req,res);
		}
	},
	// 上传图片
	uploadImage: function(req,res){
		if(method=='post'){
			var image = req.files.productImage;
			if(image.extension=='jpg'||image.extension=='png'||image.extension=='jpeg'){
				if(image.size>maxSize){
					res.send({err:imageError.sizeLimit})
				}else{
					var tempPath = image.path;
		  			gm(tempPath)
					.size(function (err, size) {
						if(!err){
							if(size.width<minWidth||size.height<minHeight){
								res.send({err:imageError.sizeSmall});
							}else{
								var pimage = {
									name: image.name,
									width:size.width,
									height:size.height,
									path:image.path
								}
								resize(image,function(err,image){
									if(err){
										res.send(false)
									}else{
										res.send({data:image})
									}									
								})
							}						
						}else{
							res.send(false)
						}				  
					});					
				}
			}else{
					res.send({err:imageError.typeError})
			}
		}
	},
	uploadBanner: function(req,res){
		if(method=='post'){
			var image = req.files.productBanner;
			if(image.extension=='jpg'||image.extension=='png'||image.extension=='jpeg'){
				if(image.size>maxSize){
					res.send({err:imageError.sizeLimit})
				}else{
					var banner_dir = node_path.join(node_path.dirname(image.path),'..','banner')
						,banner_path = node_path.join(banner_dir,image.name)
						,url = node_path.join('/products/banner',image.name)
						;
					if(!fs.existsSync(banner_dir)){
						fs.mkdirSync(banner_dir)
					}
					// 复制图片到banner目录
					var imgData = fs.readFileSync(image.path);
					fs.writeFileSync(banner_path,imgData)
					res.send({data:url});
				}
			}else{
				res.send({err:imageError.typeError})
			}
		}		
	}
}

function resize(image,callback){
	var date = new Date()
		,folder = date.getFullYear()+parseTime((date.getMonth()+1))+parseTime(date.getDate())
		;
	var direct = node_path.join(node_path.dirname(image.path),'../',folder);
	var normalUrl = node_path.join(direct,image.name)
		,largeUrl = node_path.join(direct,'lg_'+image.name)
		,thumbUrl = node_path.join(direct,'sm_'+image.name)
		;

	// if doesn't exist path then create
	if(!fs.existsSync(direct)){  				
		fs.mkdirSync(direct);
	}
	var tempPath = image.path;
	var prefix = node_path.join('/products/',folder)
	gm(tempPath).resize(lw,lh).noProfile().write(largeUrl,function(err){
		if(!err){	
				image.largePath = node_path.join(prefix,'lg_'+image.name);
				gm(tempPath).resize(w,h).noProfile().write(normalUrl,function(err){
					if(!err){
							image.path = node_path.join(prefix,image.name);
							gm(tempPath).resize(sw,sh).noProfile().write(thumbUrl,function(err){
								if(!err){
									image.smallPath = node_path.join(prefix,'sm_'+image.name);
									callback(null,image)
								}else{
									callback(err)
								}
							})
					}else{
						callback(err)
					}
				})
		}else{
			callback(err)
		}
	});

	
}

function postProduct(req,res){
	var  params = req.body
		,id = params.id
		,title = params.title
		,price = params.price.trim()
		,oriPrice = params.oriPrice.trim()
		,count = params.count.trim()
		,startType = params.startType
		,startDate = ''
		,startTime=''
		,endTime=''	
		,normalImageUrl = params.normalImageUrl
		,bannerImageUrl = params.bannerImageUrl
		;
	//简单判断表单是否存在空值	
	if(!title||!price||!oriPrice||!count||!normalImageUrl){
		if(id){
			res.redirect('/admin/product/edit?id='+id)
		}else{
			res.redirect('/admin/product/add')
		}
	}else{
		// 获取商品图片url数组
		normalImageUrl = normalImageUrl.split(',');
		// 获取商品大图和小图url数组
		var largeImageUrl = [];
		var thumbImageUrl = [];
		normalImageUrl.forEach(function(val){
			var url = val;
			var lgUrl = url.substring(0,url.lastIndexOf('/')+1)+'lg_'+url.substring(url.lastIndexOf('/')+1);
			var smUrl = url.substring(0,url.lastIndexOf('/')+1)+'sm_'+url.substring(url.lastIndexOf('/')+1);
			largeImageUrl.push(lgUrl);
			thumbImageUrl.push(smUrl);
		});
		var product = {
			title:title,
			price:parseFloat(price),
			oriPrice:parseFloat(oriPrice),
			count:parseInt(count),
			normalImageUrl:normalImageUrl,
			largeImageUrl:largeImageUrl,
			thumbImageUrl:thumbImageUrl,
			bannerUrl:bannerImageUrl,
			startType: startType
		};
		if(startType==2){	// 设置开始时间
			var d = parseInt(params.startDate)
				;
			if(d>0&d<16){						
				startDate = new Date(new Date().toDateString()).valueOf()+d*24*3600*1000
			}else{
				res.send('只能预定15天')
				return;
			}
		}else if(startType==3){ // 立即开始
			startDate = new Date(new Date().toDateString()).valueOf()
		}
		var h = parseInt(params.startHour)
			,m = parseInt(params.startMinute)
			;		
		startTime = startDate+(h*60+m)*60*1000;
		endTime = startDate+24*3600*1000;
		if(startType!=1){
			product.saleStartTime=startTime;
			product.saleOffTime=endTime;
		}
		if(id){
			productManager.editProduct(id,product,function(err,replies){
				if(err){
					res.send('出错了')
				}else{
					var id = replies;
					res.render('admin/product_success',{type:2,id:id,user:user})
				}
			})
		}else{
			productManager.addProduct(product,function(err,replies){
				if(err){
					res.send('出错了')
				}else{
					var id = replies;
					res.render('admin/product_success',{type:1,id:id,user:user})
				}
			})
		}
	}
}

function parseTime(t,num){
	var num = num||2
		,t = t.toString()
		;
	for(;num>t.length;num--){
		t='0'+t;
	}
	return t;
}

function getIdleArr(callback){
	productManager.getReadyKeys(function(err,replies){
		var dateArr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
			,idleArr = dateArr
			;
		if(replies&&replies.length){
			idleArr = dateArr.filter(function(val){
				for(var i=0,len=replies.length;i<len;i++){
					if(val==replies[i])
						return;
				}
				return val;
			})
		}
		callback(idleArr)
	});
}

function control (obj,req,res,next){
	var action = req.params.action		
		;
	method = req.method.toLowerCase();
	path = req.path;
	user = req.session.userInfo;
	if(action&&obj[action]){
		obj[action](req,res);
	}else{
		next();
	}
}

module.exports.index = function(req,res,next){
	control(admin,req,res,next)
}
module.exports.order = function(req,res,next){
	control(order,req,res,next)
}
module.exports.product = function(req,res,next){
	control(product,req,res,next)
}
