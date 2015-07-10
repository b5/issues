var AppDispatcher = require('../dispatcher/AppDispatcher')
	, ServerConstants = require('../constants/ServerConstants')
	, ScreenConstants = require('../constants/ScreenConstants')
	, SessionStore = require('../stores/SessionStore')
	, DefaultPageOptions = require('../utils/DefaultPageOptions')
	, _ = require('underscore');

var ScreenActions = {
	fetch : function (id) {
		if (!_.isString(id)) { return false; }

		AppDispatcher.handleServerAction({
			actionType : ScreenConstants.SCREEN_FETCH,
			requestType : ServerConstants.GET,
			url : "/api/screens/" + id
		});

		return true;
	},
	create : function () {
		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_CREATE
		});
	},
	save : function (screen) {
		if (!_.isObject(screen)) { return false; }
		var remove;

		// if ths screen has a cid, remove it
		if (screen.id.indexOf("screen") !== -1) {
			remove = screen.id;
			screen.id = "";
		}

		AppDispatcher.handleServerAction({
			actionType : ScreenConstants.SCREEN_SAVE,
			requestType : (screen.id) ? ServerConstants.PUT : ServerConstants.POST,
			url : (screen.id) ? '/api/screens/' + screen.id : '/api/screens',
			data : screen,
			remove : remove
		});

		return true;
	},
	update : function (screen) {
		if (!_.isObject(screen)) { return false; }
		// prep(screen);
		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_UPDATE,
			model : screen
		});

		return true;
	},
	del : function (id) {
		if (!id) { 
			return false;
		}
		AppDispatcher.handleServerAction({
			actionType : ScreenConstants.SCREEN_DELETE,
			requestType : ServerConstants.DELETE,
			url : '/api/screens/' + id,
			id : id
		});

		return true;
	},

	// issue actions
	addIssue : function (id) {
		if (!_.isString(id)) { return false; }

		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_ADD_ISSUE,
			id : id
		});

		return true;
	},
	removeIssue : function (id, index) {

		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_REMOVE_ISSUE,
			id : id,
			index : index
		});

		return true;
	},
	updateIssue : function (id, index, issue) {
		if (!_.isString(id) || !_.isObject(issue)) { return false; }

		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_UPDATE_ISSUE,
			id : id,
			index : index,
			issue : issue
		});

		return true;
	},

	// routing actions
	toNew : function (role) {
		if (!_.isObject(role)) { return false; }
		window.router.navigate("/agency/" + role.agencySlug + "/" + roleName(role.roleType) + "/screens/new", { trigger : true });
	},
	toScreen : function (role, id) {
		if (!_.isObject(role)) { return false; }
		window.router.navigate("/agency/" + role.agencySlug + "/" + roleName(role.roleType) + "/screens/" + id, { trigger : true });
	},
	toScreens : function (role) {
		if (!_.isObject(role)) { return false; }
		window.router.navigate("/agency/" + role.agencySlug + "/" + roleName(role.roleType) +"/screens", { trigger : true });
	},
}

module.exports = ScreenActions;