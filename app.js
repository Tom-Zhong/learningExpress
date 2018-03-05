

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware'); // 可以直接引用css地址，会自动将less文件转换为css
var compression = require('compression'); // 自动压缩传输的内容
var methodOverride = require('method-override'); //让不支持put或者delete的网站也能正常用post加header请求
var responseTime = require('response-time'); //规定网站响应时间
var serveIndex = require('serve-index'); // 网站内容共享

var index = require('./routes/index');
var users = require('./routes/users');
var changecolor = require('./routes/changecolor');


var app = express();

// 引入json数据
var book = require('./js/book');


// 表示现在处于的模式，开发|生产
console.log('Now you are in the ' + new String(app.get('env')).toUpperCase() + ' mode');

app.set('view cache', false)
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.set('trust proxy', true);
app.set('jsonp callback name', 'cb');
app.set('json replacer', function (key, value) {
  if(key === 'discount'){
    return undefined;
  }
  else {
    return value
  }
})
app.set('json spaces', 4)
app.set('case sensitive routing', true)
app.set('x-powered-by', false)
app.set('subdomain offset', 3)
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(compression({threshold: 1}))
app.use(logger('dev'));
app.use(methodOverride('_method')); // 兼容不支持put和delete方法的浏览器通过post和request-header来模拟请求
app.use(responseTime({digits: 4})); // 响应超时时间限制
app.use('/shared', express.static(path.join(__dirname, 'public')), serveIndex('public', {'icons': true})); //文件下载
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/imgs', express.static(path.join(__dirname, 'public/images')));
app.use('/js',express.static(path.join(__dirname, 'public/javascripts')));


app.use(function (req, res, next){
  console.log('%s %s - %s', (new Date).toString(), req.method, req.url);
  return next();
});
app.use('/', index);
app.use('/users', users);
app.use('/color', changecolor);

app.get('/jsonp', function (req, res) {
  res.jsonp(book);
})
app.get('/json', function (req, res) {
  res.json(book);
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
