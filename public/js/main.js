//var socket = io.connect('http://localhost:8081');
// 		  socket.on('news', function (data) {
// 		    console.log(data);
// 		    socket.emit('my other event', { my: 'data' });
// });

var app = angular.module("cabin_iot", ['ui.router']);
var api = {
	"login": "/login",
	"addSensor":"/addSensor",
	"getSensorData":"/getSensorStatus",
	"getSensorBatteryData":"/getSensorBatteryData"
}

var userData = {};

app.config(function ($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/login');

    $stateProvider
    	.state('login', {
            url: '/login',
            templateUrl: '../templates/login.html',
            controller: 'login'
        })
        .state('cabinStatus', {
            url: '/cabinStatus',
            templateUrl: '../templates/showCabinStatus.html',
            controller: 'cabinStatus'
        })
        .state('addSensor', {
            url: '/addSensor',
            templateUrl: '../templates/addSensor.html',
            controller: 'addSensor'
        })
         .state('batteryStatus', {
            url: '/batteryStatus',
            templateUrl: '../templates/batteryStatus.html',
            controller: 'batteryStatus'
        })
});

app.controller('login', function ($scope, $http, $state) {

	$scope.checkLogin = function () {
		if($scope.username !== "" && $scope.password !== "") {
			$http({
	          method: 'POST',
	          url: api.login,
	          data: {
	          	"username":$scope.username,
	          	"password":$scope.password
	          }
	        }).then(function successCallback(response) {
	        			if(response.data) 
	        			{
	        				if(response.data.status == 'OK') {
	        					window.sessionStorage.setItem('username', $scope.username);
	        					$state.go('cabinStatus');
	        				}
	        			}
	              },
	              function(){
	              		alert('Sorry cannot login with this credentials.');
	              });
		}
	}
});

app.controller('cabinStatus', function ($scope, $state, $http) {
		$http({
	          method: 'GET',
	          url: api.getSensorData
	   }).then(function(response) {
	   		$scope.sensorData = response.data;
	   },function () {
	   		alert("Error occured while getting sensor data");
	   });

	   // $http({
	   //        method: 'POST',
	   //        url: '/updateMovement',
	   //        data: { "sensorId":"1.1.1" }
	   // }).then(function(response) {
	   // 		alert(response.data);
	   // },function (response) {
	   // 		alert("Error occured while updating sensor data:"+response.data);
	   // });
});

app.controller('batteryStatus', function ($scope, $state, $http) {
		$http({
	          method: 'GET',
	          url: api.getSensorBatteryData
	   }).then(function(response) {
	   		$scope.sensorBattery = response.data;
	   },function () {
	   		alert("Error occured while getting sensor battery data");
	   });
});

app.controller('addSensor', function ($scope, $state, $http) {

	$scope.sensorAdded = false;
	$scope.error=false;
	$scope.showSpinner = false;
	$scope.addSensor = function () {
		$scope.showSpinner=true;
		if($scope.floorNumber !== '' &&  $scope.sensorId !== '') {
			$http({
	          method: 'POST',
	          url: api.addSensor,
	          data: {
	          	"floorNumber":$scope.floorNumber,
	          	"sensorId":$scope.sensorId,
	          	"username":window.sessionStorage.getItem('username')
	          }
	        }).then(function successCallback(response) {
	        			if(response.data) 
	        			{
	        				if(response.data.status == 'OK') {
	        					$scope.sensorAdded = true;
	        					$scope.showSpinner = false;
								
	        				}
	        			}
	              },
	              function(response){
	              		$scope.error=true;
	              		$scope.errorDesc= response.data.status;
	              		$scope.showSpinner=false;
	              });
		}
	}
});