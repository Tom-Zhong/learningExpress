// 这里是api的vhost
var express = require('express')
var app = express();

app.get('/', function (req, res){
  res.send('这个是开发接口站点')
})

module.exports = app;