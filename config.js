module.exports = {
	"host":"http://192.168.1.105:3001",
	"shost":"http://192.168.1.105:3001",
	"mhost":"http://192.168.1.105:3001/welcome",	//触屏版域名
	"admin_host":"http://192.168.1.105:3001",
	"port":"3001",
	"env":"development",
	"title":"淘一个-美国特价正品直发闪购!",
	"redis":{
		"host":"192.168.1.200",
		"port":"6381"
	},
	"session":{
		"secret":"sdfl哪里",
		"maxAge":2*3600*1000
	},
	"cookie":{
		"secret":"23g奋斗史",
		"maxAge":24*3600*1000,
		"authCookie":"T_Auth_Info"
	},
	"administrators":[{
		"name":"admin",
		"password":"123"
	}],
	"tokens":{
		"android":"AMC4FRJZVG1T3S5NUHIWX9QKL07BOPY286ED",
		"ios":"123"
	}

}