var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  res.send('This is user page you should render');
});

module.exports = router;
