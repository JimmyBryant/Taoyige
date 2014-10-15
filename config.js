module.exports = {
	"host":"http://taoyige.com:3001",
	"shost":"http://taoyige.com:3001",
	"port":"3001",
	"redis":{
		"host":"192.168.1.200",
		"port":"6380"
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
	}]

}