var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var log4js = require('log4js');
var multer  = require('multer');

var routes = require('./routes/index');
var config = require('./config')
var app = express();

// config log4js
log4js.configure({
    appenders: [
        { type: 'console' },
        { type: 'file', filename: 'logs/taoyige.log', category: 'http' }
    ]
});

// set env
app.set('env',config.env);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// fav ico
app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
// set logger
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser(config.cookie.secret,{
    maxAge:config.cookie.maxAge
}));
app.use(session({    //添加session的支持
    store: new RedisStore({
        client:require('./base/redisCli'),
        host:config.redis.host,
        port:config.redis.port
    }),
    secret:config.session.secret,
    cookie:{
        maxAge:config.session.maxAge
    },
    saveUninitialized :true,
    resave :true
}));
app.use(function(req,res,next){
    //创建全局config
    global.appConfig = config;
    res.locals.config = config;   
    next();
});
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({ dest: path.join(__dirname, 'public/products/temp'),limits: {
      fieldNameSize: 100,
      files: 2,
      fields: 5
    }
}));
app.use('/',routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
