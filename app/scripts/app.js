'use strict';

angular.module('plumber', [
  'ngCookies',
  'ngAnimate',
  'ngRoute',
  'ngSanitize',
  'ngTouch',
  'LocalStorageModule'
])
.config(function (localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('plumber').setNotify(true, true);
});
