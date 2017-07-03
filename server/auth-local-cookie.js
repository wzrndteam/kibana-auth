'use strict';

var crypto = require('crypto');
var ldap = require('ldapjs');
var fs = require('fs');

module.exports = function (server, config) {
  const auth_config = JSON.parse(fs.readFileSync('installedPlugins/kibana-auth/config.json'));
  const _default_secret = auth_config.default_cookie_secret;
  const doc_type = auth_config.doc_type;
  
  let ldap_client;
  let client = server.plugins.elasticsearch.client;

  let ldap_opts = {
    filter: '(objectclass=user)',
    scope: 'sub',
    attributes: ['objectGUID']
  };

  let uuid = 1;

  const encode = function(pwd, secret) {
    secret = secret || _default_secret;
    var hash = crypto.createHash('sha256', secret).update(pwd).digest('hex');
    return hash;
  };
  
  const authUser = function (username, callback) {
    if (username == auth_config.root_account) {
      callback({
        name: username,
        group: 'Admin'
      })

      return;
    }
    client.search({
      index: auth_config.index_user_info,
      type: doc_type,
      body: {
        query: {
          match: {
            _id: encode(username)
          }
        }
      }
    }).then(function (res) {
      let result = res.hits.total > 0 ? res.hits.hits[0]._source : undefined;
      if (auth_config.index_log) {
        result.action = 'login';
        result.created = new Date();
        client.create({
          index: auth_config.index_log,
          type: 'kibana-auth-log',
          id: result.action + username + encode(result.created.toString()),
          body: result
        }, function (err, res) {

        });
      }

      callback(result, res);
    });
  }

  const getGroups = function (callback) {
    client.search({
      index: auth_config.index_group_info,
      type: doc_type,
      body: {
        query: {
          match_all: {}
        }
      }
    }).then(function (res){
      let data = [];
      for (var i in res.hits.hits) {
        data.push(res.hits.hits[i]._source);
      }
      callback(data);
    });
  }

  const login = function (request, reply) {
    //login console.log('try login');
    if (request.auth.isAuthenticated && request.auth.credentials != '__temp__') {
		      return replyResponse("");
    }

    var message;
    var username;
    var password;
    var checked = false;
    var processing = true;

    var replyResponse = function (message) {
      //login console.log(message);
      ldap_client.unbind(function(error) {
        if(error){
          console.log(error.message);
        } else{
          //login console.log('client disconnected');
        }
        reply(message);
      });
    }

    if (request.method === 'post') {
      username = request.payload.username;
      password = request.payload.password;
    }

    if (!username && !password) { processing = false; }
    if (username || password){
      //login console.log('connect to ldap');
      ldap_client = ldap.createClient({
        url: auth_config.ldap_url
      });
      ldap_client.bind('CN=' + username + ',' + auth_config.ldap_path, password, function (error) {        
        if (error) {
          //login console.log('ldap connect error');
          var checked = false;
          if (error.message.indexOf('80090308') != -1) {
            message = 'Invalid username or password';
          } else {
            message = error.message;
          }
          return replyResponse(message);
        } else {
          //login console.log('search');
          ldap_client.search('CN=' + username + ',' + auth_config.ldap_path, ldap_opts, function (error, search) {
            search.on('searchEntry', function(entry) {
                //login console.log('search response');
                if(entry.object) {
                    var checked = true;
                    const sid = String(++uuid);
                    let user = authUser(username, function (user, res) {
                      if (!user) {
                        return replyResponse('Unregistered user');
                      } else {
                        const setSession = function () {
                          request.server.app.cache.set(sid, user, 0, (error) => {

                            if (error) {
                              return replyResponse(error.message);
                            } else {
                              request.auth.session.set({ sid: sid });
                              //login console.log('logged in successfully')
                              return replyResponse('')
                            }

                          });
                        }

                        if (user.group != 'Admin') {
                          getGroups(function (groups) {
                            let filtered_group = groups.filter(function (group) {
                              return group.name == user.group;
                            });

                            if (filtered_group && filtered_group.length > 0) {
                              user.role = filtered_group[0].role;
                            }
                            
                            user.role = ((user.role || "") + ","+ auth_config.default_role).toLowerCase();
                            user.role += (user.group == 'Manager' ? "," + auth_config.default_role_for_manager : "").toLowerCase();

                            setSession();
                          });
                        } else {
                          setSession();
                        }
                      }
                    });
                    
                } else {
                    var checked = false;
                    message = 'Invalid username or password';
                    return replyResponse(message);
                }
            });

            search.on('error', function(error) {
              //login console.log('search on error');
                var checked = false;
                message = 'Invalid username or password';
                return replyResponse(message);
            });
          })
        }
      });
    } else {
        var processing = false;
        message = 'Missing username or password';
        return replyResponse(message);
    }
  };

  const logout = function (request, reply) {
    request.auth.session.clear();
    return reply.redirect('/');
  };

  const getUserGroup = function (request, reply) {
    reply(request.auth.credentials.group);
  }

  const getUserRoles = function (request, reply) {
    reply((request.auth.credentials.role || "").match(/[^,]+/g));
  }

  const getLimitedAccessUi = function (request, reply) {
    reply(request.auth.credentials.group != 'Admin' ? auth_config.limited_access_ui.toLowerCase().match(/[^,]+/g) : []);
  }

  server.register(require('hapi-auth-cookie'), (err) => {
    //const authHash = require('uuid/v4')();
    const authHash = crypto.randomBytes(32).toString("hex");

    if (err) {
      throw err;
    }

    const cache = server.cache({ segment: 'sessions', expiresIn: 3 * 24 * 60 * 60 * 1000 });
    server.app.cache = cache;

    server.auth.strategy('session', 'cookie', 'required', {
      password: authHash,
      cookie: 'sid',
      redirectTo: '/login',
      isSecure: false,
      clearInvalid: false,
      redirectOnTry: false,
      validateFunc: function (request, session, callback) {
        //validateFunc console.log('valudateFunc');
        
        cache.get(session.sid, (err, cached) => {
          if (err) {
            //validateFunc console.log('err');
            return callback(err, false);
          }

          if (!cached) {
            //validateFunc console.log('not cached');
            return callback(null, false);
          }
          
          let request_path = request.path.toLowerCase();
          if (request_path.indexOf('status') == -1 && request_path.indexOf('login') == -1 && request_path.indexOf('kibana-auth') == -1 && request_path.indexOf('elasticsearch/_mget') == -1 && cached.name == '__temp__') {
            //validateFunc console.log('temp login');
            //request.auth.session.clear();
            return callback(null, false);
          } else {
            if ((!request.headers['content-type'] || request.headers['content-type'].indexOf('json') == -1) && cached.group != 'Admin' && cached.role && request_path.length > 1) {
              let roles = cached.role.toLowerCase().match(/[^,]+/g);

              //checkRole console.log('check roles: ' + roles);
              let cur_role = roles.filter(function (role) {
                role = role.split('#');
                let path = role[0] || "";
                return path.length > 0 && request_path.indexOf(path) > -1;
              });

              //checkRole console.log('check roles: ' + request_path);

              if (!cur_role || cur_role.length == 0) {
                //checkRole console.log('blocked: ' + request.path);
                cached.blocked = true;
                cache.set(session.sid, cached, 0, (error) => { });
                return callback(null, false, cached);
              } else {
                let tmp = JSON.stringify(cached);
                let new_cache = JSON.parse(tmp);
                new_cache.blocked = false;
                cache.set(session.sid, new_cache, 0, (error) => { });
              }
            } else {
              //checkRole console.log('pass role check: ' + request_path);
            }
          }

          //validateFunc console.log('ok');
          return callback(null, true, cached);
        });
      }
    });

    server.route([
      {
        method: 'POST',
        path: '/trylogin',
        config: {
          auth: false,
          handler: login,
          plugins: { 'hapi-auth-cookie': { redirectTo: false } }
        }
      },
      {
        method: 'GET',
        path: '/login',
        config: {
          auth: { mode: 'try' },
          handler: function (request, reply) {
            //checkRole console.log(request.auth.credentials);
            // blocked by role
            if (request.auth.credentials && request.auth.credentials.blocked) {
              //checkRole console.log('blocked: redirecting');
              return reply.redirect('/nopermission');
            }
          
            const sid = String(++uuid);
            request.server.app.cache.set(sid, { name: '__temp__', level: 999999 }, 0, (error) => {

              if (error) {
                replyResponse(error.message);
              } else {
                request.auth.session.set({ sid: sid });
                reply.redirect('/app/kibana-auth/#');
              }
            });
          }
        }
      },
      { method: 'GET', path: '/logout', config: { handler: logout } },
      { method: 'GET', path: '/nopermission', config: { auth: false, handler: function (request, reply) {
        reply("\
        <html>\
        <body>\
        <script>alert('You don\\'t have permission.');location.replace('/');</script>\
        </body>\
        </html>\
        ");
      } } },
      {
        method: 'POST',
        path: '/getUserGroup',
        config: {
          auth: { mode: 'try' },
          handler: getUserGroup
        }
      },
      {
        method: 'POST',
        path: '/getUserRoles',
        config: {
          auth: { mode: 'try' },
          handler: getUserRoles
        }
      },
      {
        method: 'POST',
        path: '/getLimitedAccessUi',
        config: {
          auth: { mode: 'try' },
          handler: getLimitedAccessUi
        }
      }
    ]);

  });
};
