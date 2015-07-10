var StandardStore = require('ff-react/stores/StandardStore')
	, _ = require('underscore')
	, DefaultPageOptions = require('../utils/DefaultPageOptions');

/*
 * BaseStore is the basic store that all standard
 * stores can inherit from.
 */
var Store = StandardStore.extend({
	// pagination stores information on paging through
	// an action that fetches multiple models.
	// the array should be a list of all pages that have been fetched
	// pagination : {
	//	ACTION_TYPE : {
	//		"created" : [1]
	// 	},
	//	PARENT_ACTION_TYPE : {
	// 		"id_string.created" : [1,3,4,5,6,7]
	// 	}
	// }
	pagination : {},

	// internal method for adding pagination from an action
	// @param action {object} - the action object (should be fed in after a confirmed response)
	addPagination : function (action) {
		var actionId;
		if (action && action.actionType && action.data && action.response) {
			this.pagination[action.actionType] || (this.pagination[action.actionType] = {})
			actionId = (action.data.parentId) ? action.data.parentId + "." + action.data.list : action.data.list;

			if (this.pagination[action.actionType][actionId]) {
				this.pagination[action.actionType][actionId].push(action.data.page);
			} else {
				this.pagination[action.actionType][actionId] = [action.data.page];
			}

			// if we've hit the end of the list, add false to the array to signify as much
			if (!action.response.length) {
				this.pagination[action.actionType][actionId].push(false);
			}
		}
	},

	// nextPage gives the next page in a sequence for a given actionType & param combination
	// @param actionType {string} - a contstant representing the action
	// @param options - the pagination options object, should include a "list" property
	// @return number - the page number to return, 0 if we've fetched all pages
	nextPage : function (actionType, options) {
		var nextPage = 1, actionId, list;

		options = DefaultPageOptions(options);

		if (!this.pagination[actionType] || typeof options != "object") {
			return nextPage;
		}

		actionId = (options.parentId) ? options.parentId + "." + options.list : options.list;
		list = this.pagination[actionType][actionId];
		nextPage = list[list.length - 1];

		if (!nextPage) {
			return false;
		} else {
			nextPage++;
		}

		return nextPage; 
	},

	prevPage : function (actionType, options) {
		var prevPage = 0, actionId;
		if (!this.pagination.actionType || typeof options != "object") {
			return prevPage;
		}
		if (!options.list || !this.pagination[actionType]) {
			return prevPage;
		}

		actionId = (options.parentId) ? options.parentId + options.list : options.list;
		return this.pagination[actionType][actionId][0] - 1;
	},


});

module.exports = Store;