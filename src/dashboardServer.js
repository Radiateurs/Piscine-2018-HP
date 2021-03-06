//External node module imports
const express = require('express');
const expressSession = require('express-session');
const body_parser = require('body-parser');
const passport = require('passport');
const { migrate, erase } = require('./utils/db-handler')


function DashboardServer(config) {
    this.config = config;
    this.app = express();

    // Bind member functions
    this.start = DashboardServer.prototype.start.bind(this);
    this.setupUsers = DashboardServer.prototype.setupUsers.bind(this);
    this.setupHouses = DashboardServer.prototype.setupHouses.bind(this);
    this.setupPoints = DashboardServer.prototype.setupPoints.bind(this);
    this.setupCities = DashboardServer.prototype.setupCities.bind(this);

    this.requestMiddleware = require('./utils/middlewares');

    this.app.set('x-powered-by', false);
}

DashboardServer.prototype.start = function () {
    let _this = this
    return new Promise((resolve, reject) => {
        erase();
        migrate().then(() => {

            // Setup sessions with third party middleware
            _this.app.use(expressSession({
                secret: 'EPISCINE',
                saveUninitialized: false,
                resave: false,
                cookie: { secure: false },
                store: _this.mongoStore
            })
            );

            _this.app.use(passport.initialize());
            _this.app.use(passport.session());

            // Init third party middleware for parsing HTTP requests body
            _this.app.use(body_parser.urlencoded({
                extended: true
            }));
            _this.app.use(body_parser.json());

            _this.app.use('/', _this.requestMiddleware.verifySessionAndPrivilege);

            _this.setupCities();
            _this.setupUsers();
            _this.setupHouses();
            _this.setupPoints();

            resolve(_this.app);
            return true;
        }).catch((error) => {
            reject(error);
            return false
        });
    });
}

DashboardServer.prototype.setupUsers = function () {
    // Import the controller
    const UserController = require('./controllers/userController');
    this.userCtrl = new UserController();

    //Passport session serialize and deserialize
    passport.serializeUser(this.userCtrl.serializeUser);
    passport.deserializeUser(this.userCtrl.deserializeUser);

    this.app.route('/whoami')
        .get(this.userCtrl.whoAmI); //GET current session user

    // Log the user in
    this.app.route('/users/login').post(this.userCtrl.loginUser);

    // Log the user out
    this.app.route('/users/logout').post(this.userCtrl.logoutUser);

    // Interacts with the user in the DB
    // (POST : create / DELETE : delete )
    // Real path is /users
    this.app.route('/users')
        .get(this.userCtrl.getUser)
        .post(this.userCtrl.createUser)
        .delete(this.userCtrl.eraseUser);
};

DashboardServer.prototype.setupCities = function () {
    const cityController = require('./controllers/cityController');
    this.cityCtrl = new CityController();

    // Handle the house Getter / Creator / Deletor
    this.app.route('/:city')
        .get(this.cityCtrl.getCity)
        .post(this.cityCtrl.createCity)
        .delete(this.cityCtrl.deleteCity);
};

DashboardServer.prototype.setupHouses = function () {
    const HouseController = require('./controllers/houseController');
    this.houseCtrl = new HouseController();

    // Handle the house Getter / Creator / Deletor
    this.app.route('/:city/house')
        .get(this.houseCtrl.getHouse)
        .post(this.houseCtrl.createHouse)
        .delete(this.houseCtrl.deleteHouse);
};

DashboardServer.prototype.setupPoints = function () {
    const PointsController = require('./controllers/pointController');
    this.pointCtrl = new PointsController();

    // Handle the point Getter / Creator / Deletor
    this.app.route('/:city/point')
        .get(this.pointCtrl.getPoints)
        .post(this.pointCtrl.createPoints)
        .delete(this.pointCtrl.deletePoints);
};


module.exports = DashboardServer;