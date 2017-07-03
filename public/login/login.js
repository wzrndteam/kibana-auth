let uiRoutes = require('ui/routes');

let _objHttp = undefined;
const _http = function (req, http) {
  req.method = req.method || "POST";
  req.headers = req.headers || {"kbn-version": "4.6.5"};

  http = http || _objHttp;
  return _objHttp(req);
}

const loginRouteInfo = {
  template: require('plugins/kibana-auth/login/login.html'),
  controller: function ($scope, $http) {
    _objHttp = $http;
    $('nav').remove();
    _http({
          url: "/getUserGroup"
    }).then(function (res) {
      if (res.data) {
        location.replace('/');
      }
    })

    $scope.doLogin = function(e) {
      $('input[type="submit"]').hide();

      _http({
        url: "/trylogin",
        data: {
          username: $("[name=username]").val(),
          password: $("[name=password]").val()
        }
      }).then(function(res) {
        if (res.data == '') {
          $scope.message = 'logged in successfully';
          location.replace('/');
        } else {
          $scope.message = res.data;
        }
        $('input[type="submit"]').show();
      }, function (res) {
        $scope.message = res.statusText;
        $('input[type="submit"]').show();
      });
      e.preventDefault();
    }
  }
}

const managerRouteInfo = {
  template: require('plugins/kibana-auth/login/manager.html'),
  controller: function ($scope, $http) {
    _objHttp = $http;

    $scope.createData = {group:''};
    $scope.users = $scope.groups = null;
    $scope.editUsers = $scope.editGroups = {};
    $scope.createTarget = "User";
    $scope.creating = false;
    $scope.userLevel = 99999;

    const _default_groups = [
      { name: "Admin", level: 0 },
      { name: "Manager", level: 1 }
    ];


    const init = function () {
      searchAll('group').then(function () {
        _http({
          url: "/getUserGroup"
        }).then(function (res) {
          if (!res.data) {
            location.replace('/');
          }

          $scope.userLevel = $scope.getGroup(res.data).level;

          _updateAcceptedGroups();
          if ($scope.userLevel > 1) {
            location.replace('/');
          }
        });

        searchAll();
      });
    }

    const _updateAcceptedGroups = function () {
        $scope.accepted_groups = $scope.groups.filter(function (n) {
          
          return n.level >= $scope.userLevel;
        });
    }
    const searchAll = function (target) {
      return _req('searchAll', undefined, undefined, target).then(function (res) {
        if (target && target.toLowerCase() == 'group') {
          $scope.groups = _default_groups.filter(function (group) {
            return $scope.getGroup(group.name, res.data).level == 99999;
          }).concat(res.data);

          _updateAcceptedGroups();
        } else {
          $scope.users = res.data;
        }
        $scope.$applyAsync();
      });
    }

    const _req = function (act, data, req, target) {
      req = req || {
        data: data
      };
      target = target || "user";
      req.url = req.url || "/kibana-auth/" + target.toLowerCase() + "/" + act;
      return _http(req);
    }

    $scope.getGroup = function (groupName, groups) {
      groups = groups || $scope.groups || _default_groups;

      let filtered = groups.filter(function (group) {
        return group.name == groupName;
      });

      return filtered.length > 0 ? filtered[0] : {name:'Removed', level:99999};
    }

    $scope.editUser = function (e, user) {
      if ($scope.userLevel <= $scope.getGroup(user.group).level || $scope.userLevel == 0) {
        $scope.editUsers[user.name] = true;
      } else {
        alert('You cannot modify accounts are higher privileges than you.')
      }
    }

    $scope.editGroup = function (e, group) {
      if ($scope.userLevel < $scope.getGroup(group.name).level) {
        $scope.editGroups[group.name] = true;
      } else {
        alert('You cannot modify groups are higher privileges than you.')
      }
    }

    $scope.create = function (e) {
      if (!$scope.createData || !$scope.createData.name) {
        $scope.message = "Invalid " + $scope.createTarget + " name";
        return false;
      }

      if ($scope.creating) {
        return false;
      }

      $scope.creating = true;
      $scope.createTarget = $scope.createTarget;

      if ($scope.createTarget == 'Group') {
        $scope.createData.level = 2;
      } else if (!$scope.createData.group) {
        $scope.message = "Invalid group";
        return false;
      }
      _req('create', {data: $scope.createData}, undefined, $scope.createTarget).then(function (res) {
        if (!res.data) {
          $scope.message = "Failed to add" + $scope.createTarget;
        }

        $scope.creating = false;

        setTimeout(function () { 
          if ($scope.createTarget == 'User') {
            searchAll();
          } else {
            searchAll('group');
          }
         }, 1000);
      });
    }

    $scope.updateUser = function (e, user) {
      _req('update', {data: user}).then(function (res) {
        if (!res.data) {
          alert('Failed to update user');
        } else {

        }

        $scope.editUsers[user.name] = false;
        
        setTimeout(searchAll, 1000);
      });
    }

    $scope.deleteUser = function (e, user) {
      if (!confirm('Are you sure you want to delete ' + user.name)) {
        return false;
      }

      _req('delete', {data: user}).then(function (res) {
        if (!res.data) {
          alert('Failed to delete user');
        } else {

        }

        $scope.editUsers[user.name] = false;

        setTimeout(searchAll, 1000);
      });
    }

    $scope.updateGroup = function (e, group) {
      _req('update', {data: group}, undefined, 'group').then(function (res) {
        if (!res.data) {
          alert('Failed to update group');
        } else {

        }

        $scope.editGroups[group.name] = false;
        
        setTimeout(function () { searchAll('group'); }, 1000);
      });
    }

    $scope.deleteGroup = function (e, group) {
      if (!confirm('Are you sure you want to delete ' + group.name)) {
        return false;
      }

      _req('delete', {data: group}, undefined, 'group').then(function (res) {
        if (!res.data) {
          alert('Failed to delete group');
        } else {

        }

        $scope.editGroups[group.name] = false;

        setTimeout(function () { searchAll('group'); }, 1000);
      });
    }

    init();
  }
}

uiRoutes.enable();
uiRoutes
.when('/', loginRouteInfo)
.when('/manager', managerRouteInfo)
.when('/:type', loginRouteInfo);