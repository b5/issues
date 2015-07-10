var App = require('../views/App')
	, Login = require('../views/Login')
	, Screens = require('../views/Screens')
	, Screen = require('../views/Screen')
	, Issue = require('../views/Issue')

var SessionStore = require('../stores/SessionStore')

var currentView = undefined
	, _appView = undefined;


function changeView (view, options) {
	var main = document.getElementById('app');
	React.unmountComponentAtNode(main)
	currentView = React.createElement(view, options || {});
	React.render(currentView, main);
}

function AppView (component, options) {
	options || (options = {})
	var main = document.getElementById('app');

	options.element = component;

	_appView = React.createElement(App, options);
	React.unmountComponentAtNode(main)

	React.render(_appView, main)
}

var Router = Backbone.Router.extend({
	routes : {
		"" : "screens",
		"screens" : "screens",
		"screens/:id" : "screen",
		"screens/:id/:issueNum" : "issue",
		"login" : "login",
	},
	login : function () {
		var account = SessionStore.current();
		if (account) {
			if (account.id) {
				return window.router.navigate('/', { trigger : true });
			}
		}
		
		changeView(Login);
	},
	changePassword : function () {
		changeView(ChangePassword);
	},
	screens : function () {
		AppView(Screens);
	},
	screen : function (screenId) {
		AppView(Screen, { screenId : screenId });
	},
	issue : function (id, index) {
		AppView(Issue, { screenId : id, index : +index });
	}
});

module.exports = window.router = new Router();