/** @jsx React.DOM */

/*
 * Basic Login Component.
 */

var SessionActions = require('../actions/SessionActions')
	, SessionStore = require('../stores/SessionStore');

var Message = require('ff-react/components/message')
	, TouchInput = require('ff-react/components/TouchInput')
	, TouchButton = require('ff-react/components/TouchButton')
	, LoadingTouchButton = require('ff-react/components/LoadingTouchButton');


var Login = React.createClass({
	// Component lifecycle methods
	componentDidMount : function () {
		this.redirectIfLoggedIn();
		SessionStore.onChange(this.redirectIfLoggedIn);
		SessionStore.onError(this.onStoreError);
	},
	componentWillUnmount : function () {
		SessionStore.offChange(this.redirectIfLoggedIn);
		SessionStore.offError(this.onStoreError);
	},
	getInitialState : function () {
		return {
			error : undefined,
			loading : false,
			loggedIn : false
		}
	},

	// Methods
	redirectIfLoggedIn : function () {
		var account = SessionStore.current()
		if (account) {
			// double check to make sure we're *actually* logged in
			if (account.id) {
				if (this.state.loading) {
					this.setState({ loading : false, loggedIn : true });
					setTimeout(SessionActions.toHome, 600);
				} else if (!this.state.loggedIn) {
					// ensuring a state of loggedIn : false  will prevent 
					// additional calls from triggering toHome too early
					SessionActions.toHome();
				}
			}
		}
	},

	// Event Handlers
	onStoreError : function (action) {
		var message
		if (action.error) {
			message = action.error.message
		}
		this.setState({ error : message, loading : false });
	},
	onSubmit : function (e) {
		e.preventDefault();

		var email = this.refs["email"].getDOMNode().value
			, password = this.refs["password"].getDOMNode().value;
		
		SessionActions.login(email, password);
		this.setState({ error : undefined, loading : true });
	},

	// Render
	render : function () {
		var error
			, className = "login small form";
		
		if (this.state.error) {
			error = <Message message={this.state.error} />
		}

		if (this.state.loggedIn) {
			className += " fadeOut";
		}

		return (
			<div className={className}>
				<div id="logo"><img src="/svg/logotype.svg" /></div>
				<form className="login" onSubmit={this.onSubmit}>
					<h3>Login:</h3>
					{error}
					<TouchInput ref="email" type="email" name="email" placeholder="email" autoCapitalize="none" />
					<TouchInput ref="password" type="password" name="password" placeholder="password" />
					<LoadingTouchButton type="submit" text="Login" onClick={this.onSubmit} loading={this.state.loading} />
					<hr />
					<em><a href="/login/forgot">forgot password</a></em>
				</form>
			</div>
		);
	}
});

module.exports = Login;