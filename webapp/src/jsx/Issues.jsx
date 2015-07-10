
var ScreenActions = require('../actions/ScreenActions');

var IssueItem = require('./IssueItem')
var List = require('ff-react/components/List')

var TouchAnchor = require("ff-react/components/TouchAnchor")

var Issues = React.createClass({
	propTypes : {
		screenId : React.PropTypes.string.isRequired,
		data : React.PropTypes.array.isRequired
	},

	// event handlers
	onSelectIssue : function (issue, index) {
		window.navigator.navigate("/screens/" + this.props.screenId + "/" + index, { trigger : true });
	},
	onAddIssue : function () {
		ScreenActions.addIssue(this.props.screenId);
	},

	// render
	render : function () {
		return (
			<div className="issues">
				<div className="row span10">
					<TouchAnchor className="ss-icon right" onClick={this.onAddIssue} text="plus" />
					<h4>Issues</h4>
				</div>
				<div className="clear"></div>
				<List data={this.props.data} screenId={this.props.screenId} element={IssueItem} onSelectItem={this.onSelectIssue} noItemsString="No Issues" />
				<div className="clear"></div>
			</div>
		);
	}
});

module.exports = Issues;