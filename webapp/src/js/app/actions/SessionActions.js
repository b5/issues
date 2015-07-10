var AppDispatcher = require('../dispatcher/AppDispatcher');

var ServerConstants = require('../constants/ServerConstants')
	, SessionConstants = require('../constants/SessionConstants');

var _ = require('underscore');

var SessionActions = {
	update : function (attrs) {
		if (!_.isObject(attrs)) { return false;}

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_UPDATE_ACCOUNT,
			requestType : ServerConstants.PUT,
			url : '/api/users/' + attrs.id,
			data : attrs
		});
		
		SessionActions.toHome()
		return true;
	},
	login : function (email, password) {
		if (!_.isString(email) || !_.isString(password)) { return false; }

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_LOGIN,
			requestType : ServerConstants.POST,
			url : "/api/login",
			data : {
				"email" : email,
				"password" : password
			}
		});

		return true;
	},
	logout : function () {
		// simply navigating to logout will log the
		// account out.
		window.location.href = "/logout";
	},
	setPassword : function (password, repeat) {
		if (!password || !repeat) { return false; }

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_SET_PASSWORD,
			requestType : ServerConstants.PUT,
			url : "/api/me/setpassword",
			data : {
				password : password,
				repeat : repeat
			}
		});

		return true;
	},

	setCurrentRole : function (role) {
		if (!_.isObject(role)) { return false; }
		AppDispatcher.handleViewAction({
			actionType : SessionConstants.SESSION_SET_CURRENT_ROLE,
			role : role
		});

		return true;
	},

	setRoles : function (roles) {
		if (!_.isArray(roles)) { return false; }

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_SET_ROLES,
			requestType : ServerConstants.PUT,
			url : "/api/me/roles",
			data : roles
		});

		return true;
	},

	// routing
	logout : function () {
		window.location.href = "/logout";
		// window.router.navigate('/logout',  { trigger : true });
	},
	toHome : function () {
		window.router.navigate("/", { trigger : true });
	}
}

module.exports = SessionActions;