module.exports = function (kibana) {

  return new kibana.Plugin({
    name: 'kibana-auth',
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Kibana Auth',
        description: 'Kibana accounts manager',
        main: 'plugins/kibana-auth/login/login',
        url: '/app/kibana-auth#/manager'
      },
      chromeNavControls: ['plugins/kibana-auth/logout/logout'],
      hacks: ['plugins/kibana-auth/ui-hacks/hide-nav']
    },

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init: function (server, options) {
      require('./server/auth-local-cookie')(server, options);
      require('./server/usermanager')(server, options);
    }

  });
};
