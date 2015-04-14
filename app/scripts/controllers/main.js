'use strict';

angular.module('plumber').controller('MainController', ['$window', '$scope', '$timeout', '$cookieStore', 'localStorageService', function ($window, $scope, $timeout, $cookieStore, localStorageService) {

  var defaults = {
    RECONNECT_DELAY: 10,
    STATUS_DELAY: 200
  };

  $scope.state = {
    eventlist: {
      prettifyJson: true
    },
    connection: {
      autoReconnect: true,
      reconnectDelay: defaults.RECONNECT_DELAY
    }
  };

  $scope.createChannel = function () {

    var channel = {
      name: 'channel-' + $scope.channels.length,
      active: false,
      status: 0, // connecting
      events: [],
      reconnectPromise: null,
      properties: {
        url: 'ws://localhost:9000/api/live',
        useCommonProperties: false,
        commonProperties: '',
        cookies: ''
      }
    };

    var setCookies = function () {
      if (channel.properties.cookies.length > 0) {
        var cookies = JSON.parse(channel.properties.cookies);
        if (cookies) {
          for (var cookieName in cookies) {
            $cookieStore.put(cookieName, cookies[cookieName]);
          }
        } else {
          console.log('Malformed json in channel.properties.cookies', channel.properties.cookies);
        }
      }
    };

    /* handlers */

    channel.connect = function () {
      channel.status = 0;
      // set cookies, some might be needed at handshake
      setCookies();
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

    channel.disconnect = function () {
      if (channel.status === 1) {
        channel.socket.close();
      }
    };

    channel.toggle = function () {
      $timeout.cancel(channel.reconnectPromise);
      if (channel.status === -1) {
        channel.connect();
      } else if (channel.status === 1) {
        channel.disconnect();
      }
    };

    channel.send = function (text) {
      if (!text || text.length === 0) {
        text = '{}';
      }
      // parse text to json message
      var json = JSON.parse(text);
      if (channel.properties.useCommonProperties && channel.properties.commonProperties.length > 0) {
        var commonProperties = JSON.parse(channel.properties.commonProperties);
        // merge these into the json message
        if (commonProperties) {
          json = angular.extend(commonProperties, json);
        }
      }
      // apply macros
      for (var property in json) {
        if (json.hasOwnProperty(property) && typeof json[property] === 'string') {
          var replaced = json[property].replace('$uid', channel.utils.uuid());
          // replace $timestamp with int
          if (replaced === '$timestamp') {
            replaced = channel.utils.timestamp();
          }
          json[property] = replaced;
        }
      }
      // set cookies
      setCookies();
      // send
      if (channel.status === 1) {
        channel.socket.send(JSON.stringify(json));
      }
      // build internal event and store
      var event = {
        timestamp: channel.utils.timestamp(),
        content: json,
        inward: false
      };
      channel.events.push(event);
    };

    /* callbacks */

    channel.socket.onopen = function () {
      console.log('[WS]', 'connected');
      $scope.$apply(function () {
        channel.status = 1;
        var wrapped = {
          timestamp: channel.utils.timestamp(),
          system: true,
          content: 'Connected'
        };
        channel.events.push(wrapped);
      });
    };
    channel.socket.onclose = function () {
      console.log('[WS]', 'closed');
      $scope.$apply(function () {
        $timeout(function () {
          channel.status = -1;
        }, defaults.STATUS_DELAY);
      });
    };
    channel.socket.onerror = function (e) {
      console.log('[WS]', 'error', e);
      $scope.$apply(function () {
        $timeout(function () {
          channel.status = -1;
        }, defaults.STATUS_DELAY);
      });
      if ($scope.state.connection.autoReconnect) {
        channel.reconnectPromise = $timeout(function () {
          channel.connect();
        }, $scope.state.connection.reconnectDelay * 1000);
      }
    };
    channel.socket.onmessage = function (event) {
      console.log('[WS]', 'received', event);
      $scope.$apply(function () {
        var json = JSON.parse(event.data);
        var wrapped = {
          timestamp: channel.utils.timestamp(),
          content: json,
          inward: true
        };
        channel.events.push(wrapped);
      });
    };

    channel.utils = {};
    channel.utils.uuid = function () {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      }

      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };
    channel.utils.timestamp = function () {
      return new Date().getTime();
    };

    // add to channels
    $scope.channels.push(channel);
    // return
    return channel;
  };

  $scope.selectChannel = function (channel) {
    $scope.selectedChannel = channel;
    $scope.selectedChannel.active = true;
  };

  $scope.editor = {};

  $scope.editor.loadEvent = function (event) {
    $scope.toBeSent = $scope.prettyfy(event.content);
  };

  $scope.editor.loadModel = function () {
    $scope.toBeSent = $scope.prettyfy(JSON.parse($scope.selectedChannel.properties.commonProperties), $scope.state.eventlist.prettifyJson);
  };

  $scope.editor.saveModel = function () {
    var json = JSON.parse($scope.toBeSent);
    if (json) {
      for (var property in json) {
        if (json.hasOwnProperty(property)) {
          if (property === 'timestamp') {
            json[property] = '$timestamp';
          } else if (property === 'uid') {
            json[property] = '$uid';
          }
        }
      }
      $scope.selectedChannel.properties.commonProperties = JSON.stringify(json, null, '');
    }
  };

  $scope.editor.clear = function () {
    $scope.toBeSent = '';
  };

  $scope.send = function () {
    $scope.selectedChannel.send($scope.toBeSent);
  };

  $scope.clearEvents = function () {
    $scope.selectedChannel.events = [];
  };

  $scope.prettyfy = function (json, format) {
    var format = format ? '\t' : '';
    return JSON.stringify(json, null, format);
  };

  $scope.formatDate = function (timestamp) {
    return '(' + new Date(timestamp).toLocaleTimeString() + ')';
  };

  $scope.openNewInstance = function () {
    $scope.storeSettings();
    $window.open($window.location.href, '_blank');
  };

  $scope.storeSettings = function () {
    if (localStorageService.isSupported) {
      var settings = {
        globalSettings: $scope.state,
        channelProperties: $scope.selectedChannel.properties
      };
      localStorageService.set('settings', settings);
    }
  };

  $scope.loadSettings = function () {
    var settings = localStorageService.get('settings');
    if (settings) {
      console.log('[Plumber] Loaded settings from ' + localStorageService.getStorageType(), settings);
      if (settings.hasOwnProperty('globalSettings')) {
        $scope.state = angular.extend($scope.state, settings.globalSettings);
      }
      if (settings.hasOwnProperty('channelProperties')) {
        $scope.selectedChannel.properties = angular.extend($scope.selectedChannel.properties, settings.channelProperties);
      }
    }
  };

  /* init */

  $scope.channels = [];
  $scope.selectedChannel = null;

  // create a channel by default and select it
  $scope.selectChannel($scope.createChannel());

  // react to some state changes
  $scope.$watch('state.eventlist.prettifyJson', function () {
    // re-render the event list by copying it
    var events = angular.copy($scope.selectedChannel.events);
    $scope.selectedChannel.events = events;
  }, true);
  $scope.$watch('state.connection.autoReconnect', function (on) {
    if (on && $scope.channels[0].status === -1) {
      $scope.selectedChannel.connect();
    } else {
      // cancel launched reconnects
      $timeout.cancel($scope.selectedChannel.reconnectPromise);
    }
  }, true);

  // load settings from localStorage
  $scope.loadSettings();

  // persist settings to localStorage before window close
  $window.onbeforeunload = function () {
    $scope.storeSettings();
  };

}]);
