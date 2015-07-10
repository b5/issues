var AppDispatcher = require('../dispatcher/AppDispatcher')
	, SessionConstants = require('../constants/SessionConstants')
  , Store  = require('./Store')
  , _ = require('underscore');

var roleOrder = {
  "model" : 0,
  "booker" : 1,
  "accountant" : 2,
  "manager" : 3,
  "admin" : 4
};

var _current;

function login(user) {
  _current = user;
  SessionStore.emitChange();
}

var SessionStore = Store.extend({
  // get the currently logged in user, if any
  // @return {object|undefined}
  current : function () {
    return _current;
  },
  
  // checks to see if a password is valid
  // @param password {string} - the user-entered password 
  // @param repeat {string} - the user-entered confirmation
  // @param cb {func} - optional callback func that will return an array of errors
  // @return {bool} - weather the passwords are valid or not
  validPassword : function (password, repeat, cb) {
    var errors = [];
    if (!_.isString(password) || password === "") {
      errors.push("password field is required");
    }
    if (!_.isString(repeat) || repeat === "") {
      errors.push("please confirm your password by entering it again into the repeat field");
    }
    if (password.length < 7) { 
      errors.push("password must be at least 7 characters long");
    }
    if (!/\d+/g.test(password)) {
      errors.push("password must contain at least one number");
    }
    if (password !== repeat) { errors.push("passwords do not match"); }
    if (typeof cb === "function") {
      cb(errors);
    }
    return (errors.length === 0);
  }
});

// turn SessionStore into a singleton
SessionStore = new SessionStore();

AppDispatcher.register(function (payload){
	var action = payload.action;

	switch (action.actionType) {
    // Current Account Actions
    case SessionConstants.SESSION_LOGIN :
      if (action.response) {
        login(action.response.user);
        SessionStore.emitChange();
      } else if (action.error) {
        SessionStore.emitError(action);
      }
      break;
		case SessionConstants.SESSION_UPDATE_ACCOUNT :
			if (action.response) {
        _current = action.response;
				SessionStore.emitChange();
			} else if (action.error) {
				SessionStore.emitError(action);
			}
			break;
    case SessionConstants.SESSION_SET_PASSWORD:
      if (action.response) {
        if (window.data) {
          // clear the setPassword flag to make the app behave
          // normally
          window.data.setPassword = undefined;
        }
        SessionStore.emitChange(action);
      } else if (action.error) {
        SessionStore.emitError(action);
      }
      break;
    case SessionConstants.SESSION_SET_CURRENT_ROLE:
      if (action.role) {
        if (SessionStore.setCurrentRole(action.role)) {
          SessionStore.emitChange();
        }
      }
      break;
    case SessionConstants.SESSION_SAVE :
      break;
  }

	return true;
});

module.exports = SessionStore;