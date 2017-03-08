var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Users = require('../collections/users.js');
// var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  initialize: function(params) {
    // console.log('line 15 users.js: ', params);

    //console.log('user.js line 17: ', params);

    this.on('creating', function(model, attrs, options) {
      var username = params.username;
      var password = params.password;

      var cb = function (username, hash) {
        console.log('user.js line 18 username: ', username, '  / hash: ', hash);
        this.set({
          username: username,
          password: hash
        });
      }.bind(this);

      //bcrypt.hash(password, 10).then(cb.bind(this));

      bcrypt.hash(password, null, null, function (err, hash) {
        console.log('user.js line 28 username: ', username, '  / hash: ', hash);

        // this.set({
        //   username: username,
        //   password: hash
        // });

        cb(username, hash);
      });
    });
  }
});

module.exports = User;