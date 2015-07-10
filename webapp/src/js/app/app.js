var Router = require('./router/Router')
	, Navbar = require('./views/Navbar');

var AppDispatcher = require('./dispatcher/AppDispatcher')
	, SessionConstants = require('./constants/SessionConstants');

(function ($){

	// Hell yes we want touch events
	React.initializeTouchEvents(true);

	if (window.data) {
		// Bootstrap stores with window.data object.
		// See individual stores "SESSION_LOGIN"
		// handler for more.
		if (window.data.user) {
			AppDispatcher.dispatch({
				type : "SERVER_ACTION",
				action : {
					actionType : SessionConstants.SESSION_LOGIN,
					response : window.data
				}
			});
		}
	}
	
	// Activate Backbone Router, loading the first view
	Backbone.history.start({ pushState: true, root : "" });
})(jQuery);