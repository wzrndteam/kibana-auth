$(document).ready(function () {
  $.ajax({
    type: 'POST',
    crossDomain: true,
    contentType: 'application/json',
    url: '/getUserRoles'
    }).done(function (roles) {
      if (!roles) return;
      $.ajax({
        type: 'POST',
        crossDomain: true,
        contentType: 'application/json',
        url: '/getLimitedAccessUi'
      }).done(function (limited_access_ui) {
        let limited_path = limited_access_ui.filter(function (limit) {
          limit = limit.split('#');
          let l_path = limit[0];
          let l_hash = limit[1] || "";

          return roles.filter(function (role) {
            role = role.split('#');
            let r_path = role[0];
            let r_hash = role[1] || "";
            return r_path && l_path.indexOf(r_path) != -1 && (l_hash == "" || r_hash.indexOf(l_hash) != -1);
          }).length == 0;
        });

        let check_role = function (url) {
          if (!url) return [];
        
          let href = url.split('#');
          let path = href[0];
          let hash = href[1] || "";

          return limited_path.filter(function (limit) {
            limit = limit.split('#');
            let l_path = limit[0];
            let l_hash = limit[1] || "";

            return path.indexOf(l_path) != -1 && (l_hash == "" || hash.indexOf(l_hash) != -1);
          });
        }

        let hide_links = function () {
          $('nav a[href], .app-links a[href]').each(function () {
            check_role($(this).attr('href')).length != 0 ? $(this).parent().hide() : undefined;
          });
        }

        $(window).bind( 'hashchange', function () {
          if (check_role(location.href).length != 0) {
            alert("You don't have permission.");
            location.hash = "/";
          }
        });

        $("[config-template='appSwitcherTemplate']").bind("DOMSubtreeModified", function () {
          hide_links();
        });

        hide_links();
      });
    });
  });