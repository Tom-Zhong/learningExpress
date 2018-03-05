var express = require('express');
var router = express.Router();

/* changecolor page */
router.get('/', function(req, res, next) {
  res.render('color', {})
});

module.exports = router;
