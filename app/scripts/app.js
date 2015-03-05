'use strict';

/**
 * @ngdoc overview
 * @name plumberApp
 * @description
 * # plumberApp
 *
 * Main module of the application.
 */
angular
  .module('plumber', [
    'ngAnimate',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ]);

/*  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainController'
      })
      .otherwise({
        redirectTo: '/'
      });
  });*/
