'use strict';

angular.module('plumber').directive('switch', ['$timeout', function($timeout) {
  return {
    restrict: 'C',
    priority: 0,
    scope: {
      internalModel: '=ngModel'
    },
    compile: function(tElement, tAttributes, transclude) {
      return {
        pre: function($scope, element, attributes) {},
        post: function($scope, element, attributes, controller) {
          
          var options = {};
          options.onSwitchChange = function(event) {
            $scope.$apply(function(){
              $scope.internalModel = event.currentTarget.checked;
            });
          };
          
          var $element = $(element);

          $timeout(function(){
            $element.bootstrapSwitch(options);
          }, 0);

        }
      };
    }
  };
}]);