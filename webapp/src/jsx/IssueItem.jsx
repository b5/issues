
var ScreenActions = require('../actions/ScreenActions');

var TouchAnchor = require('ff-react/components/TouchAnchor')
	, TouchInput = require('ff-react/components/TouchInput')
	, TouchTextarea = require('ff-react/components/TouchTextarea')
	, TouchCheckbox = require('ff-react/components/TouchCheckbox');

var RolesSelector = require('./RolesSelector');

var IssueItem = React.createClass({

	// Component Liecycle
	getDefaultProps : function () {
		return {
			yTouchThreshold : 5,
			size : "standard"
		}
	},
	
	// Event Handlers
	onDelete : function () {
		ScreenActions.removeIssue(this.props.screenId, this.props.index);
	},
	onSelect : function () {
		if (this.isMounted()) {
			// VoucherActions.toVoucher(this.props.role, this.props.data.id);
			this.props.onSelectItem(this.props.data, this.props.index);
		}
	},
	onValueChange : function (value, name) {
		var issue = this.props.data;
		
		if (name === "difficulty") {
			value = +value;
		}

		issue[name] = value;
		ScreenActions.updateIssue(this.props.screenId, this.props.index, issue);
	},

	render : function () {
		var issue = this.props.data || {}
			, className = issue.completed ? "completed item span10" : "item span10";

		return (
			<div className={className}>
				<TouchCheckbox name="completed" className="completed" value={issue.completed} onValueChange={this.onValueChange} />
				<TouchInput name="name" className="name" placeholder="name" value={issue.name} onValueChange={this.onValueChange} />
				<RolesSelector name="roles" value={issue.roles} onValueChange={this.onValueChange} />
				<TouchInput name="difficulty" className="difficulty" value={issue.difficulty} onValueChange={this.onValueChange} />
				<TouchAnchor className="ss-icon right trash" onClick={this.onDelete} text="trash" />
				<div className="clear"></div>
				<TouchTextarea name="description" className="description" value={issue.description} onValueChange={this.onValueChange} />
			</div>
		);
	}
});

module.exports = IssueItem;