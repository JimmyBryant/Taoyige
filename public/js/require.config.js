// require.js config 文件
require.config({
	baseUrl:"/js/",
	paths:{
		'jquery':'jquery/jquery-2.1.1.min',
		'jmobile':'jquery.mobile/jquery.mobile-1.4.3.min',
		'glide':'glide.min',
		'swiper':'swiper.min',
		'addressData':'addressData',
		'addrSelctor':'addrSelector',
		'modal':'bootstrap/js/bootstrap.modal.min',
		'main':'main',
		'admin.main':'admin.main',
		'umain':'user.main',
		'M_validate':'mobile.validate',
		'M_alert':'mobile.alert',
		'jform':'jquery.form.min',
		'lazy':'jquery.lazyload.min'
	},
	shim:{
		'swiper':{
			deps: ['jquery']
		},
		'glide': {
			deps: ['jquery']
		},
		'modal':{
			deps: ['jquery']
		},
		'jform':{
			deps: ['jquery']
		},
		'jform':{
			deps: ['jquery']
		}
	}
})