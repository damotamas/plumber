'use strict';

angular.module('plumber').directive('enableTab', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    priority: 0,
    link: function(scope, element, attributes) {
      element.bind('keydown keypress', function (event) {
        if (event.keyCode === 9) {

          // get caret position/selection
          var val = this.value,
            start = this.selectionStart,
            end = this.selectionEnd;

          // set textarea value to: text before caret + tab + text after caret
          this.value = val.substring(0, start) + '\t' + val.substring(end);

          // put caret at right position again
          this.selectionStart = this.selectionEnd = start + 1;

          // prevent the focus lose
          return false;
        }
      });
    }
  };
}]);
