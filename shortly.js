var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
//var cookieParser = require('cookie-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

//app.use(express.cookieParser('out, secret key'));
//app.use(express.session());
app.use(session({secret: 'ssshhhhh', resave: false, saveUninitialized: true, cookie: {maxAge: 30000}}));
//app.use(cookieParser('out, secret key'));

var restrict = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    //req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

app.get('/', restrict,
function(req, res) {
  console.log('shortly 44: ', req.session.user);
  res.render('index');
});

app.get('/create', restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', restrict,
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login',
function(req, res) {
  res.render('login');
});

//search for user in db and compare passwords
app.post('/login',
function(req, res) {
  var username = req.body.username;
  var newPassword = req.body.password;

  console.log('IN LOGIN ', req.body);
  //console.log('IN LOGIN ', username, ' ', hash);

  //fetch user with same username
  //once received, get salt of that user
  //use that salt to create hash
  //check that hash with the user that was retreived and see if they both match.
  //if they match , let them login
  //if not, redirects to login page

  //returns array of existing usernames with their hashes, and salts that match request's username
  //console.log(Users);
  new User({username: username}).fetch().then(function(account) {
    if (account) {
      console.log('account get pass: ', account.get('password'));
      bcrypt.compare(newPassword, account.get('password'), function(err, match) {
        console.log('shortly 123', match);
        console.log('shortly 124', err);
        if (match) {
          console.log('shortly 124');
          req.session.regenerate(function() {
            //req.session.user = username;
            req.session.user = true;
            return res.redirect('/');
          });
        } else {
          res.redirect('/login');
        }
      });
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.post('/signup',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  console.log('IN signup ', req.body);

  new User({
    'username': username,
    'password': password
  }).fetch().then(function(newUser) {
    //console.log(newUser);
    //console.log(Users);

    bcrypt.hash(password, null, null, function (err, hash) {
      Users.create({
        username: username,
        password: hash
      });
    }).then(function (user) {
      res.redirect('/');
    });


    //res.redirect('/');
  });

  // var salt = bcrypt.genSaltSync(10);
  // var hash = bcrypt.hashSync(password, salt);

  // Users.create({
  //   username: username,
  //   hash: hash,
  //   salt: salt
  // })
  // .then(function(newUser) {
  //   console.log(newUser);
  //   console.log(Users);
  //   res.redirect('/');
  // });

});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
