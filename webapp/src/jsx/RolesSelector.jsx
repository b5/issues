
var TouchAnchor = require('ff-react/components/TouchAnchor');

var roles = ["model", "booker", "accountant", "manager"];

var RolesSelector = React.createClass({
	propTypes : {
		name : React.PropTypes.string,
		onValueChange : React.PropTypes.func.isRequired,
		value : React.PropTypes.array
	},

	// lifecycle
	getDefaultProps : function () {
		return {
			value : []
		};
	},

	// factory functions
	roleToggler : function (role) {
		var self = this;
		return function() {
			var i = self.selectedIndex(role)
				, value = self.props.value || [];

			if (i >= 0) {
				value.splice(i,1);	
			} else {
				value.push(role);
			}

			self.props.onValueChange(value,self.props.name);
		}
	},

	// methods
	selectedIndex : function (role) {
		if (!this.props.value) { return -1; }
		for (var i=0,r; r=this.props.value[i]; i++) {
			if (role == r) {
				return i;
			}
		}
		return -1;
	},

	// render
	render : function () {
		var self = this;
		return (
			<div className="rolesSelector">
				{
					roles.map(function(role, i){
						return (<TouchAnchor className={(self.selectedIndex(role) >= 0) ? "selected role" : "role"} onClick={self.roleToggler(role)} key={i} text={role} />);
					})
				}
			</div>
		);
	}
});

module.exports = RolesSelector;