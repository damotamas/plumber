'use strict';

angular.module('plumber', [
  'ngAnimate',
  'ngRoute',
  'ngSanitize',
  'ngTouch',
  'LocalStorageModule'
])
.config(function (localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('plumber').setNotify(true, true);
});
