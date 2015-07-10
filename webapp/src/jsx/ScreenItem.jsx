
function copyTouch (t) {
	return { identifier: t.identifier, pageX: t.pageX, pageY: t.pageY, screenX : t.screenX, screenY : t.screenY };
}


var ScreenItem = React.createClass({

	// event handlers
	// And now a little uglyness:
	startTouch : undefined,
	endTouch : undefined,

	// Component Liecycle
	getDefaultProps : function () {
		return {
			yTouchThreshold : 5,
			size : "standard"
		}
	},

	// Event Handlers
	onClick : function (e) {
		e.preventDefault();
		if (this.isMounted()) {
			// VoucherActions.toVoucher(this.props.role, this.props.data.id);
			this.props.onSelectItem(this.props.data, this.props.index);
		}
	},
	onTouchStart : function (e) {
		this.startTouch = copyTouch(e.touches[0]);
	},
	onTouchEnd : function (e) {
		this.endTouch = copyTouch(e.changedTouches[0]);

		// Only trigger toClient if not scrolling
		if (Math.abs(this.startTouch.pageY - this.endTouch.pageY) < this.props.yTouchThreshold && this.isMounted()) {
			// VoucherActions.toVoucher(this.props.role, this.props.data.id);
			this.props.onSelectItem(this.props.data, this.props.index);
		}

		this.startTouch = undefined;
		this.endTouch = undefined;
	},


	// render 
	render : function () {
		var screen = this.props.data
			, completed = _.filter(screen.issues, function(i){ return (i.completed === true); }).length;
		return (
			<div className="item" onTouchStart={this.onTouchStart} onTouchEnd={this.onTouchEnd} onClick={this.onClick}>
				<h4 className="right">{completed}/{screen.issues.length}</h4>
				<h3>{this.props.data.name || "Untitled Screen"}</h3>
			</div>
		);
	}
});

module.exports = ScreenItem;