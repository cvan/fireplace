(function () {

if ('serviceWorker' in navigator) {
  var notification = require('notification');
  navigator.serviceWorker.register('/devsummit/sw.js', {
    scope: '/devsummit/'
  }).then(function(registration) {
    var newServiceWorkerAvailableMessage =
      gettext('A new version of this page is available. Please force-refresh.');

    // If this fires we should check if there's a new Service Worker
    // waiting to be activated. If so, ask the user to force refresh.
    if (registration.waiting) {
      notification.notification({message: newServiceWorkerAvailableMessage});
      return;
    }

    // We should also start tracking for any updates to the Service Worker.
    registration.onupdatefound = function(event) {
      console.log('A new version has been found... Installing...');

      // If an update is found the spec says that there is a new Service Worker
      // installing, so we should wait for that to complete then show a
      // notification to the user.
      registration.installing.onstatechange = function(event) {
        if (this.state === 'installed') {
          notification.notification({message: newServiceWorkerAvailableMessage});
          console.log()
        } else {
          console.log('New Service Worker state: ' + this.state);
        }
      };
    };
  }, function(err) {
    console.log(err);
  });
}

})();
