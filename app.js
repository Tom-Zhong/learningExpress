

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
// var busboy = require('connect-busboy'); //上传插件
var session = require('express-session'); // 会话引入
var parseurl = require('parseurl'); //对请求地址进行转换
var csrf = require('csurf'); // 防止跨站请求伪造
var csrfProtection = csrf({ cookie: true }); // 使用cookie作为csrf的容器
var parseForm = bodyParser.urlencoded({ extended: false }); // 对表单的请求进行解码
var timeout = require('connect-timeout'); //连接超时控制
var errorhandler = require('errorhandler'); // 基本错误处理器
var favicon = require('serve-favicon'); //网站小图标
var vhost = require('vhost');// 引入vhost
var multer  = require('multer') //比较好用的上传中间件
var crypto = require('crypto'); // 给文件加密
var md5 = crypto.createHash('md5');
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


// 给上传的中间件multer设置初始参数
var storage = multer.diskStorage({
  //设置上传后文件路径，uploads文件夹会自动创建。
     destination: function (req, file, cb) {
        console.log(file);
        cb(null, './public/upload')
    }, 
  //给上传文件重命名，获取添加后缀名
   filename: function (req, file, cb) {
       var fileFormat = (file.originalname).split(".");
       cb(null, file.fieldname + '-' + Date.now() + "." + fileFormat[fileFormat.length - 1]);
   },
   
}); 
var upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    console.log('处理文件后缀的问题')
    var startIndex=file.originalname.lastIndexOf(".");
    var endIndex=file.originalname.length;
    var postf = file.originalname.substring(startIndex+1,endIndex);//后缀名  
    console.log('文件的后缀名为' + postf);
    if (postf === 'ico'){
      console.log('被接受的文件名')
      cb(null, true)
      return;
    }
    else {
      console.log('不被接受的文件名')
      cb(null, false)
      return ;
    }
    // // You can always pass an error if something goes wrong:
    cb(new Error('I don\'t have a clue!'))
  }
});

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
app.get('/selectFile',csrfProtection, function (req, res){
  res.render('selectFile', { csrfToken: req.csrfToken() })
})
// 只对上传字段中avatar进行操作
app.post('/profile', upload.single('avatar'), parseForm, csrfProtection, function (req, res, next) {
  // req.file 是 `avatar` 文件
  // req.body 对象中是表单中提交的文本字段(如果有)
  console.log('上传的文件的信息: ' + req.file) //自动将文件处理并且给出文件信息
  // console.log(req.body); // 自动将表单数据进行处理
  if(req.file === undefined){
    res.status(403).end('not ok, the file type is illegal!')
  }else {
    res.status(200).end('The file has success to upload!');
  }
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
