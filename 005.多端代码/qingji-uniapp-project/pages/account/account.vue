<template>
	<view class="account-page">
		<qj-top-bar back title="账号与安全" />

		<view class="qj-page qj-page--sub">
			<view class="account-hero">
				<view class="qj-avatar">🍑</view>
				<view class="qj-grow account-hero__info">
					<text class="account-hero__name">{{ user ? user.username : '轻记用户' }}</text>
					<text class="account-hero__meta">{{ registeredLabel(user && user.createdAt) }}</text>
				</view>
				<text class="qj-pill qj-pill--green">已登录</text>
			</view>

			<view class="qj-card">
				<view class="qj-section-title">
					<text>账号信息</text>
				</view>
				<view class="info-row">
					<text class="info-row__label">用户名</text>
					<text class="info-row__value">{{ user ? user.username : '—' }}</text>
				</view>
				<view class="info-row">
					<text class="info-row__label">注册时间</text>
					<text class="info-row__value">{{ registeredLabel(user && user.createdAt) }}</text>
				</view>
				<view class="info-row">
					<text class="info-row__label">登录方式</text>
					<text class="info-row__value">用户名 + 密码</text>
				</view>
				<view class="info-row">
					<text class="info-row__label">联系方式</text>
					<text class="info-row__value qj-muted">不收集邮箱 / 手机号</text>
				</view>
			</view>

			<view class="qj-card">
				<view class="qj-section-title">
					<text>修改密码</text>
					<text class="qj-section-title__hint">修改后其他设备会被登出</text>
				</view>

				<view class="qj-field">
					<text class="qj-label">当前密码</text>
					<input
						v-model="currentPassword"
						class="qj-input"
						:password="!showPassword"
						type="text"
						maxlength="64"
						placeholder="请输入当前密码"
						placeholder-class="qj-placeholder"
					/>
				</view>

				<view class="qj-field">
					<text class="qj-label">新密码</text>
					<input
						v-model="newPassword"
						class="qj-input"
						:password="!showPassword"
						type="text"
						maxlength="64"
						placeholder="8–64 位，需同时包含字母和数字"
						placeholder-class="qj-placeholder"
					/>
				</view>

				<view class="qj-field">
					<text class="qj-label">确认新密码</text>
					<input
						v-model="confirmPassword"
						class="qj-input"
						:password="!showPassword"
						type="text"
						maxlength="64"
						placeholder="再输入一次新密码"
						placeholder-class="qj-placeholder"
					/>
				</view>

				<view class="show-row" @tap="showPassword = !showPassword">
					<text>{{ showPassword ? '隐藏密码' : '显示密码' }}</text>
				</view>

				<view v-if="error" class="qj-error">{{ error }}</view>

				<button class="qj-btn qj-btn--primary qj-btn--block" :disabled="saving" @tap="changePassword">
					{{ saving ? '修改中…' : '保存新密码' }}
				</button>
			</view>

			<view class="qj-card recovery-card">
				<view class="recovery-card__head">
					<view class="recovery-card__icon">🔑</view>
					<view class="qj-grow">
						<text class="recovery-card__title">恢复码</text>
						<text class="recovery-card__desc">注册时生成，只在当时展示一次</text>
					</view>
				</view>
				<text class="recovery-card__body">
					恢复码用于忘记密码时重置账号。服务端只保存它的哈希值，因此无法再次查看；请翻看注册时的截图或剪贴板。
				</text>
			</view>

			<view class="qj-card">
				<view class="danger-row" @tap="notOpen('注销账号')">
					<view>
						<text class="danger-row__title">注销账号</text>
						<text class="danger-row__desc">账号注销接口暂未开放</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
			</view>

			<view class="logout-wrap">
				<button class="qj-btn qj-btn--danger qj-btn--block" @tap="confirmLogout">退出登录</button>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { currentUser, requireUser, changePassword as changePasswordApi, logout } from '../../common/auth.js'
	import { registeredLabel, safeError } from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				user: currentUser(),
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
				showPassword: false,
				saving: false,
				error: ''
			}
		},
		onShow() {
			this.user = currentUser()
			if (!this.user) this.loadUser()
		},
		methods: {
			registeredLabel,
			async loadUser() {
				const user = await requireUser()
				if (user) this.user = user
			},
			validate() {
				if (!this.currentPassword) return '请输入当前密码'
				if (this.newPassword.length < 8 || this.newPassword.length > 64) {
					return '新密码长度需为 8–64 位'
				}
				if (!/[A-Za-z]/.test(this.newPassword) || !/\d/.test(this.newPassword)) {
					return '新密码需同时包含字母和数字'
				}
				if (this.newPassword !== this.confirmPassword) {
					return '两次输入的新密码不一致'
				}
				if (this.currentPassword === this.newPassword) {
					return '新密码不能和当前密码相同'
				}
				return ''
			},
			async changePassword() {
				if (this.saving) return
				this.error = this.validate()
				if (this.error) return
				this.saving = true
				try {
					await changePasswordApi(this.currentPassword, this.newPassword)
					this.currentPassword = ''
					this.newPassword = ''
					this.confirmPassword = ''
					uni.showToast({ title: '密码已修改', icon: 'success' })
				} catch (error) {
					this.error = safeError(error)
				} finally {
					this.saving = false
				}
			},
			notOpen(name) {
				uni.showModal({
					title: name,
					content: '当前版本的后端还没有开放这个接口，账目不会受到影响。',
					showCancel: false,
					confirmText: '知道了'
				})
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
	.account-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 100% 0%, rgba(255, 208, 225, 0.55), transparent 30%),
			#fff7f9;
	}

	.account-hero {
		display: flex;
		align-items: center;
		padding: 28rpx;
		margin-bottom: 22rpx;
		border-radius: 34rpx;
		background: linear-gradient(135deg, #fff0f5, #ffffff 75%);
		border: 1rpx solid #f3d6e0;
	}

	.account-hero__info {
		margin-left: 20rpx;
	}

	.account-hero__name {
		display: block;
		color: #2b151e;
		font-size: 36rpx;
		font-weight: 800;
	}

	.account-hero__meta {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 21rpx;
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 17rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.info-row:last-child {
		border-bottom: 0;
	}

	.info-row__label {
		color: #7a5462;
		font-size: 23rpx;
	}

	.info-row__value {
		max-width: 70%;
		color: #3f2a33;
		font-size: 23rpx;
		text-align: right;
	}

	.show-row {
		margin: -8rpx 0 18rpx;
		color: #a52c5f;
		font-size: 22rpx;
		font-weight: 600;
		text-align: right;
	}

	.recovery-card__head {
		display: flex;
		align-items: center;
	}

	.recovery-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		margin-right: 16rpx;
		border-radius: 20rpx;
		background: #fff0e2;
		font-size: 32rpx;
	}

	.recovery-card__title {
		display: block;
		color: #3f2a33;
		font-size: 26rpx;
		font-weight: 700;
	}

	.recovery-card__desc {
		display: block;
		margin-top: 2rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.recovery-card__body {
		display: block;
		margin-top: 18rpx;
		color: #7a5462;
		font-size: 22rpx;
		line-height: 1.65;
	}

	.danger-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6rpx 0;
	}

	.danger-row__title {
		display: block;
		color: #a9374a;
		font-size: 26rpx;
		font-weight: 600;
	}

	.danger-row__desc {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.logout-wrap {
		margin-top: 28rpx;
	}
</style>
