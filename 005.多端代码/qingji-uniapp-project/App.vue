<script>
	export default {
		onLaunch: function() {
			// 多端启动入口：具体登录校验由登录页 / 受保护页面完成
		},
		onShow: function() {},
		onHide: function() {}
	}
</script>

<style>
	page {
		background: #fff7f9;
		color: #2b151e;
		font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif;
		font-size: 28rpx;
		line-height: 1.55;
	}

	view,
	text,
	button,
	input,
	textarea,
	scroll-view,
	picker {
		box-sizing: border-box;
	}

	button {
		margin: 0;
		padding: 0;
		background: transparent;
		line-height: 1.2;
		font-size: 28rpx;
		border-radius: 0;
	}

	button::after {
		border: 0;
	}

	.qj-page {
		min-height: 100vh;
		padding: 20rpx 28rpx 160rpx;
	}

	.qj-page--sub {
		padding-bottom: 60rpx;
	}

	.qj-page--auth {
		min-height: 100vh;
		padding: 0 40rpx 72rpx;
	}

	.qj-card {
		background: #ffffff;
		border: 1rpx solid #f3d6e0;
		border-radius: 32rpx;
		box-shadow: 0 12rpx 40rpx rgba(165, 44, 95, 0.06);
		padding: 30rpx;
	}

	.qj-card + .qj-card {
		margin-top: 22rpx;
	}

	.qj-card--soft {
		background: #fff7fa;
		box-shadow: none;
	}

	.qj-card--pink {
		background: linear-gradient(135deg, #ffe3ec 0%, #fff7fa 60%, #ffffff 100%);
	}

	.qj-row {
		display: flex;
		align-items: center;
	}

	.qj-between {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.qj-grow {
		flex: 1;
		min-width: 0;
	}

	.qj-muted {
		color: #7a5462;
	}

	.qj-faint {
		color: #a98996;
	}

	.qj-small {
		font-size: 24rpx;
	}

	.qj-tiny {
		font-size: 22rpx;
	}

	.qj-strong {
		font-weight: 700;
	}

	.qj-primary {
		color: #a52c5f;
	}

	.qj-green {
		color: #2f7d6d;
	}

	.qj-danger {
		color: #a9374a;
	}

	.qj-num {
		font-family: "Avenir Next", "DIN Alternate", "PingFang SC", sans-serif;
		font-variant-numeric: tabular-nums;
	}

	.qj-section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 32rpx 4rpx 16rpx;
		font-size: 28rpx;
		font-weight: 700;
		color: #5f3d4a;
	}

	.qj-section-title__hint {
		font-size: 22rpx;
		font-weight: 400;
		color: #a98996;
	}

	.qj-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 88rpx;
		padding: 0 32rpx;
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: 700;
	}

	.qj-btn--primary {
		color: #ffffff;
		background: #e86193;
		box-shadow: 0 10rpx 24rpx rgba(165, 44, 95, 0.2);
	}

	.qj-btn--primary[disabled],
	.qj-btn--primary.is-disabled {
		opacity: 0.5;
		box-shadow: none;
	}

	.qj-btn--soft {
		color: #a52c5f;
		background: #ffe3ec;
	}

	.qj-btn--ghost {
		color: #5f3d4a;
		background: #ffffff;
		border: 1rpx solid #f3d6e0;
	}

	.qj-btn--danger {
		color: #a9374a;
		background: #fdebee;
	}

	.qj-btn--block {
		width: 100%;
	}

	.qj-btn--small {
		min-height: 64rpx;
		padding: 0 24rpx;
		font-size: 24rpx;
	}

	.qj-field {
		margin-bottom: 24rpx;
	}

	.qj-label {
		display: block;
		margin-bottom: 10rpx;
		font-size: 24rpx;
		font-weight: 700;
		color: #5f3d4a;
	}

	.qj-input,
	.qj-textarea {
		width: 100%;
		min-height: 88rpx;
		padding: 0 24rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 22rpx;
		background: #ffffff;
		color: #2b151e;
		font-size: 28rpx;
	}

	.qj-textarea {
		min-height: 180rpx;
		padding: 20rpx 24rpx;
		line-height: 1.6;
	}

	.qj-input--soft {
		background: #fff7fa;
		border-color: #f3d6e0;
	}

	.qj-placeholder {
		color: #b99aa5;
	}

	.qj-help {
		margin-top: 10rpx;
		font-size: 22rpx;
		color: #a98996;
		line-height: 1.5;
	}

	.qj-error {
		margin: 12rpx 0;
		padding: 16rpx 20rpx;
		border-radius: 16rpx;
		background: #fdebee;
		color: #a9374a;
		font-size: 24rpx;
	}

	.qj-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 12rpx 24rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 999rpx;
		background: #ffffff;
		color: #5f3d4a;
		font-size: 24rpx;
	}

	.qj-chip.is-active {
		border-color: #e86193;
		background: #ffe3ec;
		color: #a52c5f;
		font-weight: 700;
	}

	.qj-chip + .qj-chip {
		margin-left: 14rpx;
	}

	.qj-empty {
		padding: 64rpx 24rpx;
		text-align: center;
		color: #a98996;
	}

	.qj-empty__emoji {
		display: block;
		margin-bottom: 12rpx;
		font-size: 64rpx;
	}

	.qj-empty__title {
		display: block;
		margin-bottom: 8rpx;
		color: #5f3d4a;
		font-size: 28rpx;
		font-weight: 700;
	}

	.qj-divider {
		height: 1rpx;
		background: #f3d6e0;
		margin: 24rpx 0;
	}

	.qj-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 92rpx;
		height: 92rpx;
		border-radius: 50%;
		background: #ffe3ec;
		font-size: 44rpx;
	}

	.qj-peach {
		font-size: 40rpx;
		line-height: 1;
	}

	.qj-pill {
		display: inline-flex;
		align-items: center;
		padding: 6rpx 16rpx;
		border-radius: 999rpx;
		background: #fdf1f5;
		color: #7a5462;
		font-size: 20rpx;
	}

	.qj-pill--green {
		background: #e8f7f2;
		color: #2f7d6d;
	}

	.qj-pill--pink {
		background: #ffe3ec;
		color: #a52c5f;
	}

	.qj-loading {
		padding: 60rpx;
		text-align: center;
		color: #a98996;
		font-size: 24rpx;
	}

	.qj-safe-bottom {
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.qj-link {
		color: #a52c5f;
		font-weight: 700;
	}

	.qj-list-row {
		display: flex;
		align-items: center;
		min-height: 96rpx;
		padding: 18rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.qj-list-row:last-child {
		border-bottom: 0;
	}

	.qj-list-row__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		margin-right: 20rpx;
		border-radius: 20rpx;
		background: #fdf1f5;
		font-size: 32rpx;
	}

	.qj-list-row__title {
		display: block;
		color: #2b151e;
		font-size: 28rpx;
		font-weight: 600;
	}

	.qj-list-row__desc {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 22rpx;
	}

	.qj-arrow {
		color: #c9aab6;
		font-size: 36rpx;
		font-weight: 300;
	}

	.qj-tag-expense {
		color: #a52c5f;
	}

	.qj-tag-income {
		color: #2f7d6d;
	}
</style>
