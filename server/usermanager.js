'use strict';

var crypto = require('crypto');
var ldap = require('ldapjs');
var fs = require('fs');

module.exports = function (server, config) {
  const auth_config = JSON.parse(fs.readFileSync('installedPlugins/kibana-auth/config.json'));
  const _default_secret = auth_config.default_user_secret;
  const doc_type = auth_config.doc_type;
  
  let client = server.plugins.elasticsearch.client;

  const encode = function(pwd, secret) {
    secret = secret || _default_secret;
    var hash = crypto.createHash('sha256', secret).update(pwd).digest('hex');
    return hash;
  };

  const getRemoteAddress = function(request) {
    return request.info.address || request.info.remoteAddress;
  }
  
  const create = function (request, reply) {
    let index = request.params.target == 'user' ? auth_config.index_user_info : auth_config.index_group_info;
    let data = request.payload.data;
    data.created = new Date();

    client.create({
      index: index,
      type: doc_type,
      id: encode(data.name),
      body: data
    }, function (err, res) {
      if (err) {
        return reply(err);
      }
      if (res.created) {
        _log(request, 'create_' + request.params.target, data);
        reply(true);
      } else {
        reply(false);
      }
    });
  }

  const update = function (request, reply) {
    let index = request.params.target == 'user' ? auth_config.index_user_info : auth_config.index_group_info;
    let data = request.payload.data;
    client.exists({
      index: index,
      type: doc_type,
      id: encode(data.name)
    }).then(function (exists){
      if (!exists) {
        create(request, reply);
      } else {
        client.update({
          index: index,
          type: doc_type,
          id: encode(data.name),
          body: {
            doc: data
          }
        }).then(function (res) {
          _log(request, 'update_' + request.params.target, data);
          reply(true);
        });
      }
    })
  }

  const remove = function (request, reply) {
    let index = request.params.target == 'user' ? auth_config.index_user_info : auth_config.index_group_info;
    let data = request.payload.data;
    client.delete({
      index: index,
      type: doc_type,
      id: encode(data.name)
    }).then(function (res) {
      _log(request, 'remove_' + request.params.target, data);
      reply(res);
    });
  }

  const searchAll = function (request, reply) {
    let index = request.params.target == 'user' ? auth_config.index_user_info : auth_config.index_group_info;

    client.indices.exists({
      index: index
    }).then(function (exists){
      if (exists) {
        client.search({
          index: index,
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
          reply(data);
        });
      } else {
        reply([]);
      }
    });
  }

  const searchUser = function (name) {
    return client.search({
      index: auth_config.index_user_info,
      type: doc_type,
      body: {
        query: {
          match: {
            _id: encode(username)
          }
        }
      }
    });
  }

  const _log = function (request, act, data) {
    if (!auth_config.index_log) return;

    let date_now = new Date();
    data.action = act;
    data.created = date_now;
    data.actor = request.auth.credentials;
    data.ip_addr = getRemoteAddress(request);
    client.create({
      index: auth_config.index_log + '-' + date_now.getFullYear() + '-' + ('0' + date_now.getMonth()).substr(-2, 2) + '-' + ('0' + date_now.getDay()).substr(-2, 2),
      type: 'kibana-auth-log',
      id: data.action + data.name + encode(data.created.toString()),
      body: data
    }, function (err, res) {

    });
  }

  server.route([
    {
      method: 'POST',
      path: '/kibana-auth/{target}/create',
      config: {
        handler: create
      }
    },
    {
      method: 'POST',
      path: '/kibana-auth/{target}/update',
      config: {
        handler: update
      }
    },
    {
      method: 'POST',
      path: '/kibana-auth/{target}/delete',
      config: {
        handler: remove
      }
    },
    {
      method: 'POST',
      path: '/kibana-auth/{target}/searchAll',
      config: {
        handler: searchAll
      }
    }
  ]);

};
