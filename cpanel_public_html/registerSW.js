(function () {
  if (!('serviceWorker' in navigator)) return;

  var path = window.location.pathname.toLowerCase();
  var search = window.location.search.toLowerCase();

  // If visiting a .php file (such as /debug.php), unregister any Service Worker and clear old Workbox precaches
  if (path.indexOf('.php') !== -1 || search.indexOf('debug=') !== -1) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var hadRegs = regs && regs.length > 0;
      Promise.all(regs.map(function (r) { return r.unregister(); })).then(function () {
        if ('caches' in window) {
          caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }).then(function () {
            if (hadRegs && !sessionStorage.getItem('trippool_php_reloaded')) {
              sessionStorage.setItem('trippool_php_reloaded', '1');
              window.location.reload();
            }
          });
        }
      });
    });
    return;
  }

  sessionStorage.removeItem('trippool_php_reloaded');

  window.addEventListener('load', function () {
    // Also clean up any legacy workbox-precache caches on page load
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          if (k.indexOf('workbox-precache') !== -1) {
            caches.delete(k);
          }
        });
      });
    }

    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (reg) {
      reg.update();
    }).catch(function () {});
  });
})();
