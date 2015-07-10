
var ScreenStore = require('../stores/ScreenStore')
	, ScreenActions = require('../actions/ScreenActions');

var Issues = require('./Issues');

var TouchAnchor = require('ff-react/components/TouchAnchor')
	, TouchInput = require('ff-react/components/TouchInput')
	, TouchTextarea = require('ff-react/components/TouchTextarea')
	, FourOhFour = require('ff-react/components/FourOhFour')

var Screen = React.createClass({
	propTypes : {
		screenId : React.PropTypes.string.isRequired
	},

	// lifecycle
	getInitialState : function () {
		return {
			screen : ScreenStore.one(this.props.screenId) || {}
		};
	},
	componentDidMount : function () {
		ScreenStore.onChange(this.onStoreChange);
	},
	componentWillUnmount : function () {
		ScreenStore.offChange(this.onStoreChange);
	},

	// event handlers
	onStoreChange : function () {
		this.setState({ screen : ScreenStore.one(this.props.screenId) });
	},
	onValueChange : function (value, name) {
		var screen = this.state.screen;
		screen[name] = value;
		ScreenActions.update(screen);
	},
	onSave : function () {
		ScreenActions.save(this.state.screen);
	},

	// render
	render : function () {
		var screen = this.state.screen;

		if (!screen) {
			return (
				<div id="page" className="screen container">
					<FourOhFour />
				</div>
			);
		}

		return (
			<div id="page" className="screen container">
				<div className="row span10">
					<TouchAnchor className="ss-icon right" onClick={this.onSave} text="save" />
					<TouchInput name="name" placeholder="name" className="name" value={screen.name} onValueChange={this.onValueChange} />
					<TouchInput name="endpoint" placeholder="endpoint" className="endpoint" value={screen.endpoint} onValueChange={this.onValueChange} />
					<TouchTextarea name="description" className="description" placeholder="description" value={screen.description} onValueChange={this.onValueChange} />
				</div>
				<div className="clear"></div>
				<Issues screenId={screen.id} data={screen.issues} />
			</div>
		);
	}
});

module.exports = Screen;