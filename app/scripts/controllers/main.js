'use strict';

angular.module('plumber').controller('MainController', ['$scope', '$timeout', function ($scope, $timeout) {

  var defaults = {
    RECONNECT_DELAY: 5000,
    STATUS_DELAY: 200
  };

  $scope.state = {
    eventlist: {
      shortFormat: true
    }
  };

  $scope.createChannel = function() {

    var channel = {
      name: 'channel-' + $scope.channels.length,
      active: false,
      status: 0, // connecting
      events: [],
      properties: {
        url: 'ws://localhost:9000/api/live',
        useCommonProperties: false,
        commonProperties: ''
      }
    };

    /* handlers */   

    channel.connect = function() { 
      channel.status = 0;
      var socket = new WebSocket(channel.properties.url);
      if (channel.socket) {
        socket.onopen = channel.socket.onopen;
        socket.onclose = channel.socket.onclose;
        socket.onerror = channel.socket.onerror;
        socket.onmessage = channel.socket.onmessage;
      }
      channel.socket = socket;
    };
    // connect channel right away
    channel.connect();

    channel.disconnect = function() {
      if (channel.status === 1) {
        channel.socket.close();
      }
    };

    channel.toggle = function() {
      if (channel.status===-1) {
        channel.connect();
      } else if (channel.status===1) {
        channel.disconnect();
      }
    };

    channel.send = function(text) {
      // parse text to json message
      var json = JSON.parse(text);
      if (channel.properties.useCommonProperties && channel.properties.commonProperties.length > 0) {
        var commonProperties = JSON.parse(channel.properties.commonProperties);
        // merge these into the json message
        if (commonProperties) {
          json = angular.extend(commonProperties, json);
        }
      }
      // send
      if (channel.status === 1) {
        channel.socket.send(JSON.stringify(json));
      }
      // build internal event and store
      var event = {
        timestamp: new Date().getTime,
        content: json,
        inward: false
      };
      channel.events.push(event);
    };

    /* callbacks */

    channel.socket.onopen = function () {
      console.log('[WS]', 'connected');
      $scope.$apply(function(){
        channel.status = 1;
      });
    };
    channel.socket.onclose = function () {
      console.log('[WS]', 'closed');
      $scope.$apply(function(){
        $timeout(function(){ channel.status = -1; }, defaults.STATUS_DELAY);
      });
    };
    channel.socket.onerror = function (e) {
      console.log('[WS]', 'error', e);
      $scope.$apply(function(){
        $timeout(function(){ channel.status = -1; }, defaults.STATUS_DELAY);
      });
      $timeout(function(){ channel.connect(); }, defaults.RECONNECT_DELAY);
    };
    channel.socket.onmessage = function (event) {
      console.log('[WS]', 'received', event);
      $scope.$apply(function(){
        var json = JSON.parse(event.data);
        var wrapped = {
          timestamp: new Date().getTime,
          content: json,
          inward: true
        };
        channel.events.push(wrapped);
      });
    };

    // add to channels
    $scope.channels.push(channel);
    // return
    return channel;
  };

  $scope.selectChannel = function(channel) {
    $scope.selectedChannel = channel;
    $scope.selectedChannel.active = true;
  };

  $scope.prepareEvent = function(event) {
    $scope.toBeSent = JSON.stringify(event.content);
  };

  $scope.send = function() {
    $scope.selectedChannel.send($scope.toBeSent);
  };

  $scope.prettyfy = function(json, shortFormat) {
    var format = shortFormat ? '' : '\t';
    return JSON.stringify(json, null, format);
  };

  /* init */

  $scope.channels = [];
  $scope.selectedChannel = null;

  // create a channel by default and select it
  $scope.selectChannel($scope.createChannel());

  // react to some state changes
  $scope.$watch('state.eventlist.shortFormat', function(){
    // re-render the event list by copying it
    var events = angular.copy($scope.selectedChannel.events);
    $scope.selectedChannel.events = events;
  }, true);

}]);
