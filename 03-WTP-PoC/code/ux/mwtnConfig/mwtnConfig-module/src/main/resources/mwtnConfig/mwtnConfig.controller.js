/*
 * Copyright (c) 2016 highstreet technologies GmbH and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */

define(['app/mwtnConfig/mwtnConfig.module',
        'app/mwtnConfig/mwtnConfig.services',
        'app/mwtnConfig/mwtnConfig.directives'],
        function(mwtnConfigApp) {

  mwtnConfigApp.register.controller('mwtnConfigCtrl', ['$scope', '$rootScope', '$q', '$mwtnLog', '$mwtnConfig',  
                                                       function($scope, $rootScope, $q, $mwtnLog, $mwtnConfig) {

    var COMPONENT = 'mwtnConfigCtrl';
    $mwtnLog.info({component: COMPONENT, message: 'mwtnConfigCtrl started!'});

    $rootScope['section_logo'] = 'src/app/mwtnConfig/images/mwtnConfig.png'; // Add your topbar logo location here such as 'assets/images/logo_topology.gif'
    $scope.parts = $mwtnConfig.parts;
    var initPac = {
        layerProtocol: 'unknown'              
    };
    $scope.parts.map(function(part){
      initPac[part] = {info: 'No data available'};
    });
    $scope.schema = {init:false};
    $mwtnConfig.getSchema().then(function(data){
      $scope.schema = data;
    }, function(error){
      console.log('bad luck - no schema ;( ');
    });
    $scope.path = {};
    

//    $scope.getUnit = $mwtnCommons.getUnit;
//    $scope.getTest = function(key, value) {
//      console.log(key, value);
//      return key;
//    };

    var initNodeList = function(nodes){
      $scope.networkElements = [];
      nodes.map(function(ne) {
        // revision detection should go to commons
        if (ne['netconf-node-topology:connection-status'] === 'connected' && ne['netconf-node-topology:available-capabilities'] && ne['netconf-node-topology:available-capabilities']['available-capability']) {
          ne['netconf-node-topology:available-capabilities']['available-capability'].map(function(cap){
            if (cap.contains('CoreModel-CoreNetworkModule-ObjectClasses')) {
              ne.onfCoreModelRevision = cap.split('?revision=')[1].substring(0,10);
            } else if (cap.contains('MicrowaveModel-ObjectClasses-AirInterface')) {
              ne.onfAirIinterfaceRevision = cap.split('?revision=')[1].substring(0,10);
            }  else if (!ne.onfAirIinterfaceRevision && cap.contains('MicrowaveModel-ObjectClasses')) {
              ne.onfAirIinterfaceRevision = cap.split('?revision=')[1].substring(0,10);
            } 
          });
          if (ne.onfAirIinterfaceRevision) {
            $scope.networkElements.push({id:ne['node-id'], revision:ne.onfAirIinterfaceRevision});
          }
        }
      });
      $scope.networkElements.sort(function(a, b){
        if(a.id < b.id) return -1;
        if(a.id > b.id) return 1;
        return 0;
      });
      
      // select one of the nodes
      var select = parseInt(Math.random()*$scope.networkElements.length);
      $scope.networkElement = $scope.networkElements[select].id;      
    };
    
    $mwtnConfig.getActualNetworkElements().then(function(nodes){
      initNodeList(nodes);
    }, function(error){
      $scope.networkElements = [];
    });
    
    var order = {
        'MWPS':1,
        'MWS':2,
        'ETH-CTP':3
    }
    var updateNe = function(data) {
      if (!data) return;

      // update onfNetworkElement
      switch (data.revision) {
      case '2016-03-23':
        $scope.onfNetworkElement = JSON.parse(JSON.stringify(data.NetworkElement[0]));
        $scope.onfLtps = data.NetworkElement[0]._ltpRefList;
        $scope.onfNetworkElement._ltpRefList = undefined;
        break;
      default:
        $scope.onfNetworkElement = JSON.parse(JSON.stringify(data.NetworkElement));
        $scope.onfLtps = data.NetworkElement._ltpRefList;
        $scope.onfNetworkElement._ltpRefList = undefined;
      }
      
      // update onfLTPs
      $scope.onfLtps.sort(function(a, b){
        if(order[a._lpList[0].layerProtocolName] < order[b._lpList[0].layerProtocolName]) return -1;
        if(order[a._lpList[0].layerProtocolName] > order[b._lpList[0].layerProtocolName]) return 1;
        if(a._lpList[0].uuid < b._lpList[0].uuid) return -1;
        if(a._lpList[0].uuid > b._lpList[0].uuid) return 1;
        return 0;
      });
      
      // calculate conditional packages
      $scope.airinterfaces = [];
      $scope.structures = [];
      $scope.containers = [];
      $scope.onfLtps.map(function(ltp){
        var lpId = ltp._lpList[0].uuid;
        switch (ltp._lpList[0].layerProtocolName) {
          case "MWPS":
            var init = JSON.parse(JSON.stringify(initPac));
            init.layerProtocol = lpId;
            $scope.airinterfaces.push(init);
            break;
          case "MWS":
            var init = JSON.parse(JSON.stringify(initPac));
            init.layerProtocol = lpId;
            $scope.structures.push(init);
            break;
          case "ETH-CTP":
            var init = JSON.parse(JSON.stringify(initPac));
            init.layerProtocol = lpId;
            $scope.containers.push(init);
            break;
          default:
            $mwtnLog.info({component: COMPONENT, message: 'The layerProtocol ' + ltp._lpList[0].layerProtocolName + ' is not supported (yet)!'});
        }
      });
      
      // sort the groups
      ['airinterfaces', 'structures', 'containers'].map(function(pacs){
        $scope[pacs].sort(function(a, b){
          if(a.layerProtocol < b.layerProtocol) return -1;
          if(a.layerProtocol > b.layerProtocol) return 1;
          return 0;
        });
      });
      data.revision = undefined;
    };

    var updateLtp = function(data) {
      $scope.onfLtps.map(function(ltp){
        if (ltp.uuid === data.data._ltpRefList[0].uuid) {
          ltp = data.data._ltpRefList[0];
        }
      });
    };

    var updateAirInterface = function(lpId, part, data) {
      // console.log(JSON.stringify(data), lpId);
      $scope.airinterfaces.map(function(airinterface){
        // console.log(JSON.stringify(airinterface));
        if (airinterface.layerProtocol === lpId) {
          if (Object.keys(data)[0].startsWith('airInterface')) {
            airinterface[part] = data;            
          } else if (part === 'Capability') {
            // 2. PoC
            // console.log(part, JSON.stringify(data));
            airinterface[part] = data.MW_AirInterface_Pac[0].airInterfaceCapabilityList;            
          } else if (part === 'CurrentProblems') {
            // 2. PoC
            // console.log(part, JSON.stringify(data));
            airinterface[part] = data.MW_AirInterface_Pac[0].airInterfaceCurrentProblemList;            
          }
        }
      });
      data.revision = undefined;
    };

    var updaConfigructure = function(lpId, data) {
      // console.log(JSON.stringify(data), lpId);
      $scope.structures.map(function(structure){
        // console.log(JSON.stringify(structure));
        if (structure.layerProtocol === lpId) {
          var part = Object.keys(data)[0].substring('structure'.length);
          // console.log(part);
          structure[part] = data;
        }
      });
      data.revision = undefined;
    };

    var updateContainer = function(lpId, data) {
      console.log(JSON.stringify(data), lpId);
      $scope.containers.map(function(container){
        // console.log(JSON.stringify(container));
        if (container.layerProtocol === lpId) {
          var part = Object.keys(data)[0].substring('container'.length);
          // console.log(part);
          container[part] = data;
        }
      });
      data.revision = undefined;
    };

    var updatePart = function(spec, data) {
      switch (spec.pacId) {
      case 'ne':
        updateNe(data);
        break;
      case 'ltp':
        updateLtp(data);
        break;
      case 'airinterface':
        // console.log(JSON.stringify(spec, JSON.stringify(data)));
        updateAirInterface(spec.layerProtocolId, spec.partId, data);
        break;
      case 'structure':
        // console.log(JSON.stringify(data));
        updaConfigructure(spec.layerProtocolId, data);
        break;
      case 'container':
        // console.log(JSON.stringify(data));
        updateContainer(spec.layerProtocolId, data);
        break;
      }
    };
    
    // events
    $scope.status = {};
    $scope.separator = $mwtnConfig.separator; //'&nbsp;'
    
    var getLayer = function(pacId) {
      switch (pacId) {
      case 'airinterface':
        return 'MWPS';
        break;
      case 'structure':
      case 'pureEthernetStructure':
      case 'hybridSturcture':
        return 'MWS';
        break;
      case 'ethernetContainer':
      case 'tdmContainer':
      case 'container':
        return 'ETH-CTP';
        break;
      default:
        return (pacId);
      }
    };
    
    $scope.$watch('status', function(status, oldValue) {
      Object.keys(status).map(function(key){
        if ($scope.networkElementId && status[key] && status[key] !== oldValue[key]) {
          
          var info = key.split($scope.separator);
          var spec = {
            nodeId: $scope.networkElementId,
            revision: $scope.revision,
            pacId: info[0],
            layer: getLayer(info[0]),
            layerProtocolId: info[1],
            partId: info[2]
          };
          $mwtnConfig.getPacParts(spec).then(function(success){
            updatePart(spec, success);
          }, function(error){
            updatePart(spec, error);
          });
          $scope.path = spec;
        }
      });   
    }, true);
    
    $scope.collapseAll = function() {
      // close all groups
      Object.keys($scope.status).map(function(group){
        $scope.status[group] = false;
      });
    };
    
    $scope.$watch('networkElement', function(neId, oldValue) {
      if (neId && neId !== '' && neId !== oldValue) {
        var revision;
        $scope.networkElements.map(function(ne){
          if (ne.id === neId) revision = ne.revision;
        });
        $scope.networkElementId = neId;
        $scope.revision = revision;

        var spec = {
          nodeId: neId,
          revision: revision,
          pacId: 'ne'
        };
        $mwtnConfig.getPacParts(spec).then(function(success){
          $scope.collapseAll();
          updatePart(spec, success);
        }, function(error){
          $scope.collapseAll();
          updatePart(spec, error);
        });
        $scope.path = spec;
      }
    });

  }]);

  mwtnConfigApp.register.controller('ShowListCtrl', ['$scope', '$uibModalInstance', '$uibModal', '$filter', '$mwtnCommons', 'listData', 
                                                     function ($scope, $uibModalInstance, $uibModal, $filter, $mwtnCommons, listData) {

    $scope.path = listData.path;
    $scope.listData = listData.listData;
    $scope.gridOptions = JSON.parse(JSON.stringify($mwtnCommons.gridOptions));
    $scope.highlightFilteredHeader = $mwtnCommons.highlightFilteredHeader;

//    $scope.gridOptions.rowTemplate = rowTemplate;
    
    $scope.getType = function(value) {
      var result = typeof value;
      if (result === 'object' && JSON.stringify(value).substring(0,1) === '[') {
        result = 'array';
      }
      return result;
    };

    var getCellTemplate = function(type) {
      switch (type) {
      case 'array':
        // path, grid.getCellValue(row, col)
        return ['<button ng-click="grid.appScope.showArray(grid.appScope.path, grid.getCellValue(row, col), row.entity)" class="btn btn-primary">{{\'MWTN_SHOWLIST\' | translate}}: {{grid.getCellValue(row, col).length}}  {{\'MWTN_ITEMS\'| translate}}...</button>'
                ].join('');
        break;
      case 'object':
        return ['<button ng-click="grid.appScope.showObject(grid.appScope.path, grid.getCellValue(row, col), row.entity)" class="btn btn-primary">{{\'MWTN_SHOWOBJECT\' | translate}}...</button>'].join('');
        break;
      default:
        return undefined;
      }
    };

    var enable = $scope.listData.length > 10;
    if ($scope.listData.length > 0 && $scope.getType($scope.listData[0]) === 'object') {
      $scope.gridOptions.columnDefs = Object.keys($scope.listData[0]).map(function(field){
        var type = $scope.getType($scope.listData[0][field]);
        var labelId = ['mwtn', field].join('_').toUpperCase();
        var displayName = $filter('translate')(labelId);
        var visible = true;
        if (labelId.contains('$$')) {
          visible = false;
        }
        
        return {
          field: field,
          type: type,
          displayName: displayName,
          enableSorting: enable, 
          enableFiltering:enable,
          headerCellClass: $scope.highlightFilteredHeader,
          cellTemplate: getCellTemplate(type),
          cellClass: type,
          visible: visible
        };
      });
      $scope.gridOptions.data = $scope.listData;
    }

    $scope.ok = function () {
      $uibModalInstance.close($scope.listData);
    };
  
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    $scope.showArray = function(path, attribute, row) {
      $scope.path =  path;
      $scope.path.row = Object.keys(row)[0];
      $scope.path.value = row[Object.keys(row)[0]];
      
      // $scope.path.attribute = attribute.name,
      $scope.listData = attribute; // which is an array
      var modalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title',
        ariaDescribedBy: 'modal-body',
        templateUrl: 'src/app/mwtnConfig/templates/showArray.html',
        controller: 'ShowListCtrl',
        size: 'huge',
        resolve: {
          listData: function () {
            console.log('new path', $scope.path);
            return {path:$scope.path, listData:$scope.listData};
          }
        }
      });

      modalInstance.result.then(function (listData) {
        // $mwtnLog.info({component: COMPONENT, message: 'Mount result: ' + JSON.stringify(netconfServer)});
      }, function () {
        // $mwtnLog.info({component: COMPONENT, message: 'Creation of new planned NetworkElement dismissed!'});
      });
    }
    
    $scope.showObject = function(path, objValue, row) {
      $scope.path =  path;
      $scope.path.row = Object.keys(row)[0];
      $scope.path.value = row[Object.keys(row)[0]];
      $scope.objValue = objValue;
      
      var modalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title',
        ariaDescribedBy: 'modal-body',
        templateUrl: 'src/app/mwtnConfig/templates/showObject.html',
        controller: 'ShowListCtrl',
        size: 'md',
        resolve: {
          listData: function () {
            return {path:$scope.path, objValue:$scope.objValue};
          }
        }
      });

      modalInstance.result.then(function (objValue) {
        // $mwtnLog.info({component: COMPONENT, message: 'Mount result: ' + JSON.stringify(netconfServer)});
      }, function () {
        // $mwtnLog.info({component: COMPONENT, message: 'Creation of new planned NetworkElement dismissed!'});
      });
    }

}]);

  mwtnConfigApp.register.controller('ShowListCtrl', ['$scope', '$uibModalInstance', '$uibModal', '$filter', '$mwtnCommons', 'listData', 
                                                     function ($scope, $uibModalInstance, $uibModal, $filter, $mwtnCommons, listData) {

    $scope.path = listData.path;
    $scope.listData = listData.listData;
    $scope.gridOptions = JSON.parse(JSON.stringify($mwtnCommons.gridOptions));
    $scope.highlightFilteredHeader = $mwtnCommons.highlightFilteredHeader;

//    $scope.gridOptions.rowTemplate = rowTemplate;
    
    $scope.getType = function(value) {
      var result = typeof value;
      if (result === 'object' && JSON.stringify(value).substring(0,1) === '[') {
        result = 'array';
      }
      return result;
    };

    var getCellTemplate = function(type) {
      switch (type) {
      case 'array':
        // path, grid.getCellValue(row, col)
        return ['<button ng-click="grid.appScope.showArray(grid.appScope.path, grid.getCellValue(row, col), row.entity)" class="btn btn-primary">{{\'MWTN_SHOWLIST\' | translate}}: {{grid.getCellValue(row, col).length}}  {{\'MWTN_ITEMS\'| translate}}...</button>'
                ].join('');
        break;
      case 'object':
        return ['<button ng-click="grid.appScope.showObject(grid.appScope.path, grid.getCellValue(row, col), row.entity)" class="btn btn-primary">{{\'MWTN_SHOWOBJECT\' | translate}}...</button>'].join('');
        break;
      default:
        return undefined;
      }
    };

    var enable = $scope.listData.length > 10;
    if ($scope.listData.length > 0 && $scope.getType($scope.listData[0]) === 'object') {
      $scope.gridOptions.columnDefs = Object.keys($scope.listData[0]).map(function(field){
        var type = $scope.getType($scope.listData[0][field]);
        var labelId = ['mwtn', field].join('_').toUpperCase();
        var displayName = $filter('translate')(labelId);
        var visible = true;
        if (labelId.contains('$$')) {
          visible = false;
        }
        
        return {
          field: field,
          type: type,
          displayName: displayName,
          enableSorting: enable, 
          enableFiltering:enable,
          headerCellClass: $scope.highlightFilteredHeader,
          cellTemplate: getCellTemplate(type),
          cellClass: type,
          visible: visible
        };
      });
      $scope.gridOptions.data = $scope.listData;
    }

    $scope.ok = function () {
      $uibModalInstance.close($scope.listData);
    };
  
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    $scope.showArray = function(path, attribute, row) {
      $scope.path =  path;
      $scope.path.row = Object.keys(row)[0];
      $scope.path.value = row[Object.keys(row)[0]];
      
      // $scope.path.attribute = attribute.name,
      $scope.listData = attribute; // which is an array
      var modalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title',
        ariaDescribedBy: 'modal-body',
        templateUrl: 'src/app/mwtnConfig/templates/showArray.html',
        controller: 'ShowListCtrl',
        size: 'huge',
        resolve: {
          listData: function () {
            console.log('new path', $scope.path);
            return {path:$scope.path, listData:$scope.listData};
          }
        }
      });

      modalInstance.result.then(function (listData) {
        // $mwtnLog.info({component: COMPONENT, message: 'Mount result: ' + JSON.stringify(netconfServer)});
      }, function () {
        // $mwtnLog.info({component: COMPONENT, message: 'Creation of new planned NetworkElement dismissed!'});
      });
    }
    
    $scope.showObject = function(path, objValue, row) {
      $scope.path =  path;
      $scope.path.row = Object.keys(row)[0];
      $scope.path.value = row[Object.keys(row)[0]];
      $scope.objValue = objValue;
      
      var modalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title',
        ariaDescribedBy: 'modal-body',
        templateUrl: 'src/app/mwtnConfig/templates/showObject.html',
        controller: 'ShowObjectCtrl',
        size: 'md',
        resolve: {
          objValue: function () {
            return {path:$scope.path, objValue:$scope.objValue};
          }
        }
      });

      modalInstance.result.then(function (objValue) {
        // $mwtnLog.info({component: COMPONENT, message: 'Mount result: ' + JSON.stringify(netconfServer)});
      }, function () {
        // $mwtnLog.info({component: COMPONENT, message: 'Creation of new planned NetworkElement dismissed!'});
      });
    }

}]);

  mwtnConfigApp.register.controller('ShowObjectCtrl', ['$scope', '$uibModalInstance', '$mwtnCommons', '$mwtnConfig', 'orderByFilter', 'objValue', 
                                                     function ($scope, $uibModalInstance, $mwtnCommons, $mwtnConfig, orderBy, objValue) {

    $scope.path = objValue.path;
    $scope.objValue = objValue.objValue;
    $scope.schema = {initShowObjectCtrl:false};
    $mwtnConfig.getSchema().then(function(data){
      $scope.schema = data;

      var attributes = Object.keys($scope.objValue).map(function(parameter) {
        console.log($scope.schema[parameter]);
        if ($scope.schema[parameter]) {
          console.log($scope.schema[parameter]);
          return {
            name: parameter,
            value: $scope.objValue[parameter],
            order: $scope.schema[parameter]['order-number'],
            unit:  $scope.schema[parameter].unit,
          }
        } else {
          return {
            name: parameter,
            value: $scope.objValue[parameter],
            order: 0,
            unit:  'error',
          }
        }
      });
      
      $scope.attributes =  orderBy(attributes, 'order', false);

    }, function(error){
      console.log('bad luck - no schema ;( ');
    });
    


    $scope.ok = function () {
      $uibModalInstance.close($scope.objValue);
    };
  
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

}]);
});
