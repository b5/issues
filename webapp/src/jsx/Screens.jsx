/** @jsx React.DOM */

var ScreenConstants = require('../constants/ScreenConstants')
	, ScreenStore = require('../stores/ScreenStore')
	, ScreenActions = require('../actions/ScreenActions')

var ScreenItem = require('./ScreenItem');

var List = require('ff-react/components/List')
	, TouchAnchor = require('ff-react/components/TouchAnchor')

var Screens = React.createClass({
	// lifecycle
	getInitialState : function () {
		return {
			screens : ScreenStore.alphaAll()
		}
	},
	componentDidMount : function () {
		ScreenStore.onChange(this.onStoreChange);
	},
	componentWillUnmount : function () {
		ScreenStore.offChange(this.onStoreChange);
	},

	// event handlers
	onStoreChange : function (action) {
		if (action) {
			switch (action.actionType) {
				case ScreenConstants.SCREEN_CREATE:
					window.router.navigate("/screens/" + action.screen.id, { trigger : true });
					return;
			}
		}
		this.setState({ screens : ScreenStore.alphaAll() });
	},
	onSelectScreen : function (screen) {
		window.router.navigate("/screens/" + screen.id, { trigger : true });
	},
	onNewScreen : function () {
		ScreenActions.create();
	},

	// render 
	render : function () {
		return (
			<div id="page" className="screens container">
				<div className="row span10">
					<TouchAnchor className="ss-icon right" onClick={this.onNewScreen} text="add" />
					<h1>Screens</h1>
				</div>
				<List data={this.state.screens} element={ScreenItem} noItemsString="No Screens" onSelectItem={this.onSelectScreen} />
			</div>
		);
	}
});

module.exports = Screens;