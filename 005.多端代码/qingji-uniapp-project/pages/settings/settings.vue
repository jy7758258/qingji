<template>
	<view class="settings-page">
		<qj-top-bar title="我的" />

		<view class="qj-page">
			<view class="profile-card">
				<view class="qj-avatar">🍑</view>
				<view class="qj-grow profile-card__info">
					<text class="profile-card__name">{{ user ? user.username : '轻记用户' }}</text>
					<text class="profile-card__meta">{{ registeredLabel(user && user.createdAt) }}</text>
					<view class="profile-card__pills">
						<text class="qj-pill qj-pill--pink">本地账本</text>
						<text class="qj-pill">按账号隔离</text>
					</view>
				</view>
			</view>

			<view class="qj-card profile-stats">
				<view class="profile-stats__item" @tap="goHome">
					<text class="profile-stats__icon">🧾</text>
					<text class="profile-stats__label">明细</text>
				</view>
				<view class="profile-stats__item" @tap="goStats">
					<text class="profile-stats__icon">📊</text>
					<text class="profile-stats__label">统计</text>
				</view>
				<view class="profile-stats__item" @tap="openRecord">
					<text class="profile-stats__icon">＋</text>
					<text class="profile-stats__label">记一笔</text>
				</view>
			</view>

			<view class="qj-card">
				<view class="settings-row" @tap="goAccount">
					<view class="settings-row__icon">🔐</view>
					<view class="qj-grow">
						<text class="settings-row__title">账号与安全</text>
						<text class="settings-row__desc">修改密码、恢复码说明</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
				<view class="settings-row" @tap="goData">
					<view class="settings-row__icon">🗂️</view>
					<view class="qj-grow">
						<text class="settings-row__title">数据与备份</text>
						<text class="settings-row__desc">复制备份、查看存储状态</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
				<view class="settings-row" @tap="goCategories">
					<view class="settings-row__icon">🏷️</view>
					<view class="qj-grow">
						<text class="settings-row__title">分类管理</text>
						<text class="settings-row__desc">查看支出与收入分类</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
				<view class="settings-row" @tap="goPrivacy">
					<view class="settings-row__icon">🛡️</view>
					<view class="qj-grow">
						<text class="settings-row__title">隐私说明</text>
						<text class="settings-row__desc">了解数据边界与风险</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
			</view>

			<view class="qj-card">
				<view class="qj-section-title">
					<text>偏好</text>
					<text class="qj-section-title__hint">只在这台设备生效</text>
				</view>
				<view class="switch-row">
					<view class="qj-grow">
						<text class="switch-row__title">隐私模式</text>
						<text class="switch-row__desc">在明细和统计中隐藏金额</text>
					</view>
					<switch :checked="privacy" color="#e86193" @change="togglePrivacy" />
				</view>
				<view class="switch-row">
					<view class="qj-grow">
						<text class="switch-row__title">备份提醒</text>
						<text class="switch-row__desc">定期提醒复制一份账本备份</text>
					</view>
					<switch :checked="backupReminder" color="#e86193" @change="toggleBackup" />
				</view>
			</view>

			<view class="logout-wrap">
				<button class="qj-btn qj-btn--danger qj-btn--block" @tap="confirmLogout">退出登录</button>
			</view>

			<view class="settings-footer">
				<text>🍑 轻记 · 把每一笔轻轻收好</text>
				<text class="settings-footer__sub">账号认证与账本数据由本地 Spring Boot + MySQL 提供</text>
			</view>
		</view>

		<qj-tab-bar active="settings" />
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import QjTabBar from '../../components/QjTabBar.vue'
	import { currentUser, requireUser, logout } from '../../common/auth.js'
	import { STORAGE_KEYS } from '../../common/config.js'
	import { registeredLabel } from '../../common/format.js'

	export default {
		components: { QjTopBar, QjTabBar },
		data() {
			return {
				user: currentUser(),
				privacy: false,
				backupReminder: false
			}
		},
		onShow() {
			this.user = currentUser()
			this.privacy = Boolean(uni.getStorageSync(STORAGE_KEYS.privacy))
			this.backupReminder = Boolean(uni.getStorageSync(STORAGE_KEYS.backupReminder))
			if (!this.user) this.loadUser()
		},
		methods: {
			registeredLabel,
			async loadUser() {
				const user = await requireUser()
				if (user) this.user = user
			},
			togglePrivacy(event) {
				this.privacy = event.detail.value
				uni.setStorageSync(STORAGE_KEYS.privacy, this.privacy)
			},
			toggleBackup(event) {
				this.backupReminder = event.detail.value
				uni.setStorageSync(STORAGE_KEYS.backupReminder, this.backupReminder)
			},
			goHome() {
				uni.reLaunch({ url: '/pages/index/index' })
			},
			goStats() {
				uni.reLaunch({ url: '/pages/stats/stats' })
			},
			openRecord() {
				uni.navigateTo({ url: '/pages/record/record' })
			},
			goAccount() {
				uni.navigateTo({ url: '/pages/account/account' })
			},
			goData() {
				uni.navigateTo({ url: '/pages/data/data' })
			},
			goCategories() {
				uni.navigateTo({ url: '/pages/categories/categories' })
			},
			goPrivacy() {
				uni.navigateTo({ url: '/pages/privacy/privacy' })
			},
			confirmLogout() {
				uni.showModal({
					title: '退出登录',
					content: '退出后需要重新输入用户名和密码。账目不会被删除。',
					confirmText: '退出',
					confirmColor: '#a9374a',
					success: async (result) => {
						if (!result.confirm) return
						await logout()
						uni.reLaunch({ url: '/pages/login/login' })
					}
				})
			}
		}
	}
</script>

<style scoped>
	.settings-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 100% 0%, rgba(255, 208, 225, 0.62), transparent 30%),
			#fff7f9;
	}

	.profile-card {
		display: flex;
		align-items: center;
		padding: 30rpx;
		border-radius: 36rpx;
		background: linear-gradient(135deg, #fff0f5 0%, #ffffff 70%);
		border: 1rpx solid #f3d6e0;
		box-shadow: 0 12rpx 40rpx rgba(165, 44, 95, 0.06);
	}

	.profile-card__info {
		margin-left: 22rpx;
	}

	.profile-card__name {
		display: block;
		color: #2b151e;
		font-size: 38rpx;
		font-weight: 800;
	}

	.profile-card__meta {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 21rpx;
	}

	.profile-card__pills {
		display: flex;
		margin-top: 12rpx;
	}

	.profile-card__pills .qj-pill + .qj-pill {
		margin-left: 10rpx;
	}

	.profile-stats {
		display: flex;
		margin-top: 22rpx;
		padding: 14rpx 0;
	}

	.profile-stats__item {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		padding: 10rpx 0;
	}

	.profile-stats__item + .profile-stats__item {
		border-left: 1rpx solid #f7e4eb;
	}

	.profile-stats__icon {
		font-size: 34rpx;
		line-height: 1.2;
	}

	.profile-stats__label {
		margin-top: 4rpx;
		color: #7a5462;
		font-size: 21rpx;
	}

	.settings-row {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.settings-row:last-child {
		border-bottom: 0;
	}

	.settings-row__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		margin-right: 18rpx;
		border-radius: 20rpx;
		background: #fdf1f5;
		font-size: 32rpx;
	}

	.settings-row__title {
		display: block;
		color: #2b151e;
		font-size: 27rpx;
		font-weight: 600;
	}

	.settings-row__desc {
		display: block;
		margin-top: 2rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.switch-row {
		display: flex;
		align-items: center;
		padding: 18rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.switch-row:last-child {
		border-bottom: 0;
	}

	.switch-row__title {
		display: block;
		color: #3f2a33;
		font-size: 26rpx;
		font-weight: 600;
	}

	.switch-row__desc {
		display: block;
		margin-top: 3rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.logout-wrap {
		margin-top: 30rpx;
	}

	.settings-footer {
		padding: 34rpx 0 10rpx;
		color: #b99aa5;
		font-size: 21rpx;
		text-align: center;
	}

	.settings-footer__sub {
		display: block;
		margin-top: 6rpx;
		font-size: 19rpx;
	}
</style>
