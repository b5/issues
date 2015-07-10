/** @jsx React.DOM */
/*
 * Navbar for the top of the screen
 */

var SessionActions = require('../actions/SessionActions');

var Message = require('ff-react/components/message')
	, TouchAnchor = require('ff-react/components/TouchAnchor');

var Navbar = React.createClass({
	propTypes : {
		// the current role of the session account
		role : React.PropTypes.object,
		message : React.PropTypes.string,
		error : React.PropTypes.oneOf(React.PropTypes.object, React.PropTypes.string),

		onToggleMainMenu : React.PropTypes.func.isRequired
	},
	
	// Factory Functions
	navigate : function (href) {
		return function(e) {
			e.preventDefault();
			window.router.navigate(href, { trigger : true });
		}
	},

	// Render
	render : function () {
		var error, message

		if (this.props.error) {
			error = <Message message={(typeof this.props.error === "object") ? this.props.error.message : this.props.error} />
		} else if (this.props.message) {
			message = <Message message={this.props.message} />
		}


		return (
			<nav id="navbar">
				<a id="logo" onClick={this.navigate('/')} onTouchEnd={this.navigate('/')} className="logo">
					<img src="https://s3-us-west-2.amazonaws.com/ivymodels/svg/logotype.svg" />
				</a>
				<div className="container">
					<div className="items span8 offset1">
						<TouchAnchor onClick={this.navigate("/")} text="screens" />
					</div>
				</div>
				<div className="clear"></div>
				{error}
				{message}
			</nav>
		);
	}
});

module.exports = Navbar;