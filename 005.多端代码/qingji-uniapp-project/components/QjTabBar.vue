<template>
	<view class="qj-tabbar">
		<view class="qj-tabbar__inner">
			<view
				v-for="item in tabs"
				:key="item.key"
				class="qj-tabbar__item"
				:class="{ 'is-active': active === item.key }"
				@tap="go(item)"
			>
				<text class="qj-tabbar__icon">{{ item.icon }}</text>
				<text class="qj-tabbar__label">{{ item.label }}</text>
				<view v-if="active === item.key" class="qj-tabbar__dot"></view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'QjTabBar',
		props: {
			active: { type: String, default: 'home' }
		},
		data() {
			return {
				tabs: [
					{ key: 'home', label: '明细', icon: '🧾', url: '/pages/index/index' },
					{ key: 'stats', label: '统计', icon: '📊', url: '/pages/stats/stats' },
					{ key: 'settings', label: '我的', icon: '👤', url: '/pages/settings/settings' }
				]
			}
		},
		methods: {
			go(item) {
				if (item.key === this.active) return
				uni.reLaunch({ url: item.url })
			}
		}
	}
</script>

<style scoped>
	.qj-tabbar {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 90;
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
		background: rgba(255, 255, 255, 0.98);
		border-top: 1rpx solid #f3d6e0;
		box-shadow: 0 -8rpx 30rpx rgba(165, 44, 95, 0.05);
	}

	.qj-tabbar__inner {
		display: flex;
		align-items: center;
		justify-content: space-around;
		height: 118rpx;
		padding: 10rpx 60rpx 8rpx;
	}

	.qj-tabbar__item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 130rpx;
		color: #a98996;
	}

	.qj-tabbar__icon {
		margin-bottom: 4rpx;
		font-size: 38rpx;
		line-height: 1;
		filter: grayscale(0.55);
		opacity: 0.72;
	}

	.qj-tabbar__label {
		font-size: 22rpx;
	}

	.qj-tabbar__item.is-active {
		color: #a52c5f;
		font-weight: 700;
	}

	.qj-tabbar__item.is-active .qj-tabbar__icon {
		filter: none;
		opacity: 1;
	}

	.qj-tabbar__dot {
		position: absolute;
		bottom: -7rpx;
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: #e86193;
	}
</style>
