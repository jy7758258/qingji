<template>
	<view class="qj-topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="qj-topbar__inner">
			<view v-if="back" class="qj-topbar__back" @tap="goBack">‹</view>
			<view v-else-if="brand" class="qj-topbar__brand" @tap="goHome">
				<text class="qj-topbar__peach">🍑</text>
				<text class="qj-topbar__name">轻记</text>
			</view>
			<text v-if="title" class="qj-topbar__title" :class="{ 'is-center': back || brand }">{{ title }}</text>
			<view class="qj-topbar__spacer"></view>
			<view class="qj-topbar__actions">
				<view v-if="search" class="qj-topbar__action" @tap="$emit('search')">⌕</view>
				<view v-if="settings" class="qj-topbar__action" @tap="$emit('settings')">⚙</view>
				<view v-if="add" class="qj-topbar__add" @tap="$emit('add')">＋</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'QjTopBar',
		props: {
			title: { type: String, default: '' },
			back: { type: Boolean, default: false },
			brand: { type: Boolean, default: false },
			search: { type: Boolean, default: false },
			settings: { type: Boolean, default: false },
			add: { type: Boolean, default: false }
		},
		data() {
			return { statusBarHeight: 0 }
		},
		mounted() {
			try {
				const info = uni.getSystemInfoSync()
				this.statusBarHeight = info.statusBarHeight || 0
			} catch (error) {
				this.statusBarHeight = 0
			}
		},
		methods: {
			goBack() {
				uni.navigateBack({
					delta: 1,
					fail: () => {
						uni.reLaunch({ url: '/pages/settings/settings' })
					}
				})
			},
			goHome() {
				uni.reLaunch({ url: '/pages/index/index' })
			}
		}
	}
</script>

<style scoped>
	.qj-topbar {
		background: rgba(255, 247, 249, 0.98);
	}

	.qj-topbar__inner {
		display: flex;
		align-items: center;
		height: 92rpx;
		padding: 0 28rpx;
	}

	.qj-topbar__brand {
		display: flex;
		align-items: center;
		min-width: 150rpx;
	}

	.qj-topbar__peach {
		margin-right: 10rpx;
		font-size: 40rpx;
		line-height: 1;
	}

	.qj-topbar__name {
		color: #2b151e;
		font-size: 34rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
	}

	.qj-topbar__title {
		color: #2b151e;
		font-size: 32rpx;
		font-weight: 700;
	}

	.qj-topbar__title.is-center {
		margin-left: 10rpx;
	}

	.qj-topbar__back {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 70rpx;
		height: 70rpx;
		margin-left: -12rpx;
		color: #5f3d4a;
		font-size: 58rpx;
		font-weight: 300;
		line-height: 1;
	}

	.qj-topbar__spacer {
		flex: 1;
	}

	.qj-topbar__actions {
		display: flex;
		align-items: center;
	}

	.qj-topbar__action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 66rpx;
		height: 66rpx;
		margin-left: 10rpx;
		border-radius: 50%;
		background: #ffffff;
		color: #5f3d4a;
		font-size: 30rpx;
		box-shadow: 0 4rpx 14rpx rgba(165, 44, 95, 0.06);
	}

	.qj-topbar__add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 66rpx;
		height: 66rpx;
		margin-left: 12rpx;
		border-radius: 50%;
		background: #e86193;
		color: #ffffff;
		font-size: 38rpx;
		font-weight: 300;
		line-height: 1;
		box-shadow: 0 8rpx 18rpx rgba(165, 44, 95, 0.22);
	}

	/* 微信小程序右上角胶囊需要预留空间 */
	/* #ifdef MP-WEIXIN */
	.qj-topbar__actions {
		margin-right: 170rpx;
	}
	/* #endif */
</style>
