'use strict';

angular.module('plumber').directive('popover', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    priority: 0,
    compile: function(tElement, tAttributes, transclude) {
      return {
        pre: function(scope, element, attributes) {},
        post: function(scope, element, attributes) {
          var $element = $(element);
          $timeout(function(){
            $element.popover();
          }, 0);
        }
      };
    }
  };
}]);
