var AppDispatcher = require('../dispatcher/AppDispatcher')
  , ScreenConstants = require('../constants/ScreenConstants')
  , SessionConstants = require('../constants/SessionConstants')
  , Store = require('./Store')
	, _ = require('underscore');


var agenciesThatHaveFetchedAllScreens = {}

var ScreenStore = Store.extend({
  // check to see weather a model is valid.
  // call syncronously for simple true / false, 
  // or provide a callback for error reporting.
  // @param model {object} - the model to validate
  // @param cb {function} - optional callback for errors
  // @return true if valid, error if not
  valid : function (model, cb) {
    var errors = [];

    // all models must be objects
    if (!_.isObject(model)) {
      errors.push("model must be an object");
      if (_.isFunction(cb)) {
        cb(errors);
      }
      return false;
    }

    // must have either an id or cid property
    if (!model.id && !model.cid) { 
      errors.push("model must have an id or cid property");
    }

    if (model.issues) {
      model.issues = _.sortBy(model.issues, function(r){ return r.index; });
    } else {
      model.issues = []
    }

    model.roles || (model.roles = [])

    if (_.isFunction(cb)) {
      cb(errors);
    }
    return (errors.length === 0);
  },

  alphaAll : function () {
    return _.sortBy(this.all(), function(screen){ return screen.name });
  },

  // create a new screen
  // @return {object} - new screen
  newScreen : function () {
    var screen = {
      id : _.uniqueId("screen-"),
      name : "",
      endpoint : "",
      description : "",
      issues : []
    };
    
    return _.clone(screen);
  },

  // add a issue to a screen
  // @param id {string | object} - the id/cid of the screen
  // @return {object|undefined} - the updated screen object, undefined if not found
  addIssue : function (id) {
    var screen = this._one(id);
    if (!screen) { return undefined; }
    screen.issues || (screen.issues = [])
    
    screen.issues.push({
      cid : _.uniqueId('issue-'),
      name : "",
      description : "",
      completed : false,
      difficulty : 0,
      roles : ["model","booker","accountant","manager"]
    });


    return _.clone(screen);
  },

  // update an existing issue for a screen
  // @param id {string} - the id/cid of the screen
  // @param issue {object} - the issue object to update
  // @return {object|undefined} - the updated screen object, undefined if not found
  updateIssue : function (id, index, issue) {
    var screen = this._one(id);
    if (!screen) { return undefined; }
    screen.issues[index] = issue;
    return _.clone(screen);
  },

  // remove a issue from a screen
  // @param id {string} - the id/cid of the screen
  // @param index {object} - the index to remove
  // @return {object|undefined} - the updated screen object, undefined if not found
  removeIssue : function (id, index) {
    var screen = this._one(id);
    if (!screen) { return undefined; }
    screen.issues.splice(index,1);
    return _.clone(screen);
  },
  hasFetchedAllAgencyScreens : function (agencyId) {
    return agenciesThatHaveFetchedAllScreens[agencyId] ? true : false;
  }
})

// Turn ScreenStore into a singleton.
ScreenStore = new ScreenStore();
if (window.data) {
  ScreenStore.add(window.data.screens);
}


AppDispatcher.register(function (payload){
	var action = payload.action;

	switch (action.actionType) {
    case ScreenConstants.SCREEN_FETCH_PAGE : 
      if (action.response) {
        ScreenStore.add(action.response);
        ScreenStore.addPagination(action);
        ScreenStore.emitChange();
      } else if (action.error) {
        ScreenStore.emitError(action);
      }
      break;
    case ScreenConstants.SCREEN_FETCH :
      if (action.response) {
        ScreenStore.add(action.response);
        ScreenStore.emitChange();
      } else if (action.error) {
        ScreenStore.emitError(action);
      }    
      break;
    case ScreenConstants.SCREEN_CREATE:
      var screen = ScreenStore.newScreen();
      ScreenStore.add(screen);
      action.screen = screen
      ScreenStore.emitChange(action);
      break;
		case ScreenConstants.SCREEN_SAVE :
			if (action.response) {
        if (action.remove) {
          ScreenStore.remove(action.remove);
        }
        ScreenStore.add(action.response);
				ScreenStore.emitChange(action);
			} else if (action.error) {
				ScreenStore.emitError(action);
			}
			break;
		case ScreenConstants.SCREEN_UPDATE :
      if (ScreenStore.update(action.model || action.data)) {
        ScreenStore.emitChange();
      }
			break;
		case ScreenConstants.SCREEN_DELETE:
			if (action.response) {
				ScreenStore.remove(action.id);
        ScreenStore.emitChange(action);
        ScreenStore.emitMessage('Screen Removed');
			} else if (action.error) {
				ScreenStore.emitError(action);
			}
			break;
      
    // Issue Handling
    case ScreenConstants.SCREEN_ADD_ISSUE:
      ScreenStore.addIssue(action.id);
      ScreenStore.emitChange();
      break;
    case ScreenConstants.SCREEN_UPDATE_ISSUE:
      if (ScreenStore.updateIssue(action.id, action.index, action.issue) !== undefined) {
        ScreenStore.emitChange();
      }
      break;
    case ScreenConstants.SCREEN_REMOVE_ISSUE:
      if (ScreenStore.removeIssue(action.id, action.index) !== undefined) {
        ScreenStore.emitChange();
      }
      break;

    // Screen Model Fetching
    case ScreenConstants.SCREEN_FETCH_MODELS_PAGE:
      if (action.response) {
        ScreenStore.addModels(action.id, action.response);
        ScreenStore.addPagination(action);
        ScreenStore.emitChange();
      }
      break;
    // Login Handling
    case SessionConstants.SESSION_LOGIN:
      if (action.response) {
        ScreenStore.add(action.response.screens);
      }
      break;
  }

	return true;
});

module.exports = ScreenStore;