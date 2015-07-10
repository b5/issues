
var ScreenStore = require('../stores/ScreenStore')
	, ScreenActions = require('../actions/ScreenActions');

var Issue = React.createClass({
	propTypes : {
		id : React.PropTypes.string.isRequired,
		index : React.PropTypes.number.isRequired
	},

	// render
	render : function () {
		var issue = this.props.data
		return (
			<h3>{this.props.issue}</h3>
		);
	}
});

module.exports = Issue;