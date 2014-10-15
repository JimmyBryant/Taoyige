
var crypto=require('crypto');

module.exports={
	md5 : function(str){
	    if(str){
	    	return crypto.createHash('md5').update(str).digest("hex");
	    }
	    return null;
	},
	encrypt : function (str, secret){
	    var cipher = crypto.createCipher('aes192', secret);
	    var enc = cipher.update(str, 'utf8', 'hex');
	    enc += cipher.final('hex');
	    return enc;
	},
	decrypt : function (str, secret){
	    var decipher = crypto.createDecipher('aes192', secret);
	    var dec = decipher.update(str, 'hex', 'utf8');
	    dec += decipher.final('utf8');
	    return dec;
	}
}
