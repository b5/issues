/** @jsx React.DOM */

/*
 * All Views that are part of the "App" are build with this view.
 * It includes standard navigation & structure for all components.
 * Should be used by the router to show individual pages.
 */

var _ = require('underscore');

var Navbar = require('./Navbar')
	, Message = require('ff-react/components/Message')

var SessionStore = require('../stores/SessionStore')
	, ScreenStore = require('../stores/ScreenStore')
	, DeviceStore = require('ff-react/stores/DeviceStore');

var stores = [ScreenStore];

var App = React.createClass({
	propTypes : {
		// The component to display in the app's main window
		element : React.PropTypes.func.isRequired,
		messageDelayTime : React.PropTypes.number,
	},
	// Lifecycle
	componentDidMount : function () {
		var self = this;
		stores.forEach(function(store, i){
			store.onError(self.onError);
			store.onMessage(self.onMessage);
		});

	},
	componentWillUnmount : function () {
		var self = this;
		stores.forEach(function(store, i){
			store.offError(self.onError);
			store.offMessage(self.onMessage);
		});
	},
	getDefaultProps : function () {
		return {
			messageDelayTime : 8000
		}
	},
	getInitialState : function () {
		return {
			error : undefined,
			message : undefined,
		}
	},

	// Methods
	removeMessage : function () {
		if (this.isMounted()) {
			this.setState({ message : undefined, error : undefined });
		}
	},

	// Event Handlers
	onToggleMainMenu : function (e) {
		e.stopPropagation();
		this.setState({ showingMainMenu : !this.state.showingMainMenu });
	},
	onError : function (action) {
		this.setState({ message : undefined, error : action.error });
		setTimeout(this.removeMessage, this.props.messageDelayTime);
	},
	onMessage : function (msg) {
		this.setState({ message : msg, error : undefined });
		setTimeout(this.removeMessage, this.props.messageDelayTime);
	},
	onMenuSelect : function (e) {
		this.setState({ showingMainMenu : false });
	},
	onClickStage : function (e) {
		if (this.isMounted()) {
			// auto-hide menu if a click bubbles to html
			if (this.state.showingMainMenu === true) {
				this.setState({ showingMainMenu : false });
			}
		}
	},
	onScrollStage : function (e) {
		// here we manually call emitScroll with the stage's scrolling event
		// b/c our window never scrolls.
		// Stage is the width & height of the viewport,
		// so we need to listen to it's scrolling instead
		DeviceStore._emitScroll(e);
	},

	// Render
	render : function () {
		var role
			, user = SessionStore.current();

		// if we're fed an agencySlug prop we know that
		// we're operating within the context of an agency
		// and should feed navbar the current role
		if (this.props.agencySlug) {
			role = this.props.role || SessionStore.currentRole();
		}

		return (
			<div id="ivy">
				<div id="stage" onClick={this.onClickStage} onScroll={this.onScrollStage}>
					<Navbar role={role} onToggleMainMenu={this.onToggleMainMenu} message={this.state.message} error={this.state.error} />
					<this.props.element {...this.props} />
				</div>
			</div>
		);
	}
});

module.exports = App;