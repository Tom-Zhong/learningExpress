

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
var busboy = require('connect-busboy'); //上传插件
var session = require('express-session'); // 会话引入
var parseurl = require('parseurl'); //对请求地址进行转换
var csrf = require('csurf'); // 防止跨站请求伪造
var csrfProtection = csrf({ cookie: true }); // 使用cookie作为csrf的容器
var parseForm = bodyParser.urlencoded({ extended: false }); // 对表单的请求进行解码
var timeout = require('connect-timeout'); //连接超时控制
var errorhandler = require('errorhandler'); // 基本错误处理器
var favicon = require('serve-favicon'); //网站小图标
var vhost = require('vhost');// 引入vhost
var index = require('./routes/index');
var users = require('./routes/users');
var changecolor = require('./routes/changecolor');


var app = express();
// 引入其他子站点，并且通过中间件形式控制
var mobile = require('./vhost/mobile');
var api = require('./vhost/api');
app.use(vhost('m.hackhall.com', mobile));
app.use(vhost('api.hackhall.com', api));
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
app.use(compression({threshold: 1})) // 压缩传输的文件，加快传输和减少带宽，但增加了服务器处理数据压力
app.use(logger('dev')); // 在服务器中打印相应的信息，方便进行服务器观察
app.use(methodOverride('_method')); // 兼容不支持put和delete方法的浏览器通过post和request-header来模拟请求
app.use(responseTime({digits: 4})); // 响应超时时间限制
if(app.get('env') === 'development'){
  app.use(errorhandler());
}
app.use('/shared', express.static(path.join(__dirname, 'public')), serveIndex(path.join(__dirname, 'public'), {'icons': true})); //文件下载,
app.use(bodyParser.json()); // 对客户端传来的文件类型进行处理
app.use(bodyParser.urlencoded({ extended: false }));

// session的使用，设置页面计数器，访问超过60秒的话自动清除相应的seesion
app.use(session({secret: 'keyboard cat', resave: false, saveUninitialized: true}))
app.use(function (req, res, next) {
  if(!req.session.views){
    req.session.views = {}
  }
  console.log(req.session.views)
  var pathname = parseurl(req).pathname;
  req.session.cookie.maxAge = 60000;
  // count thei views
  req.session.views[pathname] = (req.session.views[pathname] || 0 ) + 1

  next()
})
// 这里是会自动显示次数的页面，但是生存周期仅仅是存系在session中
app.get('/foo', function (req, res, next) {
  res.send('you viewed this page ' + req.session.views['/foo'] + ' times!')
})
app.get('/bar', function (req, res, next) {
  res.send('you viewed this page ' + req.session.views['/bar'] + ' times!')
})


app.use(cookieParser());  // 将客户端传来的cookie加入到req请求头中，然后传入给下一个中间件使用
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); //托管网站小图标
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/imgs', express.static(path.join(__dirname, 'public/images')));
app.use('/js',express.static(path.join(__dirname, 'public/javascripts')));
// 上传控件
app.use('/upload', busboy({immediate: true}));
app.use('/upload', function (req, res) {
  req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    file.on('data', function (data){
      fs.writeFile('upload' + fieldname + filename, data);
    })
    file.on('end', function () {
      console.log('File ' + filename + ' is ended')
    })
  });
  req.busboy.on('finish', function (){
    console.log('Busboy is finished');
    res.status(201).end();
  })
})

app.use(function (req, res, next){
  console.log('%s %s - %s', (new Date).toString(), req.method, req.url);
  return next();
});

app.get('/send', csrfProtection, function(req, res) {
  // pass the csrfToken to the view 
  res.render('send', { csrfToken: req.csrfToken() })
})
// 使用method-override让服务器支持某些只支持get和post的浏览，让他们通过get或者post方法加请求头完成更多请求
app.delete('/purchase-orders', parseForm, csrfProtection, function (req, res) {
  res.send('THE DELETE route has been triggered!').status(200);
})
app.use('/', index);
app.use('/users', users);
app.use('/color', changecolor);



// 连接超时一般是在需要处理大量请求的请求路由中。
app.get(
  '/slow-request', 
  timeout('1s'), 
  function (req, res,next) {
    setTimeout(function () {
      if (req.timedout)return false;
      return next();
    }, 999 + Math.round(Math.random()));
  }, function (req, res, next) {
    res.send('ok')
  }
)
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
