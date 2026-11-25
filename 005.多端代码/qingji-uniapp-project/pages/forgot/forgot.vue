<template>
	<view class="forgot-page">
		<qj-top-bar back title="找回密码" />
		<view class="forgot-body">
			<view class="forgot-hero">
				<view class="forgot-hero__emoji">🔑</view>
				<text class="forgot-hero__title">用恢复码找回</text>
				<text class="forgot-hero__subtitle">恢复码只在注册成功时展示一次，格式类似 ABCD-EFGH-IJKL-MNOP</text>
			</view>

			<view class="qj-card">
				<view class="qj-field">
					<text class="qj-label">用户名</text>
					<input
						v-model="username"
						class="qj-input"
						type="text"
						maxlength="20"
						placeholder="请输入注册时的用户名"
						placeholder-class="qj-placeholder"
					/>
				</view>

				<view class="qj-field">
					<text class="qj-label">恢复码</text>
					<input
						v-model="recoveryCode"
						class="qj-input"
						type="text"
						maxlength="32"
						placeholder="请输入注册时保存的恢复码"
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

				<button
					class="qj-btn qj-btn--primary qj-btn--block"
					:disabled="loading"
					@tap="submit"
				>
					{{ loading ? '重置中…' : '重置密码' }}
				</button>
			</view>

			<view class="forgot-note">
				<text class="qj-strong">没有恢复码？</text>
				<text>目前不支持通过邮箱或手机找回。恢复码丢失后，账号内的账目仍保存在本地数据库中，可联系部署者协助处理。</text>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { recover } from '../../common/auth.js'
	import { safeError } from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				username: '',
				recoveryCode: '',
				newPassword: '',
				confirmPassword: '',
				showPassword: false,
				loading: false,
				error: ''
			}
		},
		methods: {
			validate() {
				if (!String(this.username || '').trim()) return '请输入用户名'
				if (!String(this.recoveryCode || '').trim()) return '请输入恢复码'
				if (this.newPassword.length < 8 || this.newPassword.length > 64) {
					return '新密码长度需为 8–64 位'
				}
				if (!/[A-Za-z]/.test(this.newPassword) || !/\d/.test(this.newPassword)) {
					return '新密码需同时包含字母和数字'
				}
				if (this.newPassword !== this.confirmPassword) {
					return '两次输入的新密码不一致'
				}
				return ''
			},
			async submit() {
				if (this.loading) return
				this.error = this.validate()
				if (this.error) return

				this.loading = true
				try {
					await recover(
						String(this.username).trim(),
						String(this.recoveryCode).trim().toUpperCase(),
						this.newPassword
					)
					uni.showToast({ title: '密码已重置', icon: 'success' })
					setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 500)
				} catch (error) {
					this.error = safeError(error)
				} finally {
					this.loading = false
				}
			}
		}
	}
</script>

<style scoped>
	.forgot-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 12% 10%, rgba(255, 208, 225, 0.7), transparent 30%),
			#fff7f9;
	}

	.forgot-body {
		padding: 20rpx 40rpx 70rpx;
	}

	.forgot-hero {
		margin: 24rpx 0 28rpx;
		padding: 0 6rpx;
	}

	.forgot-hero__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 92rpx;
		height: 92rpx;
		margin-bottom: 20rpx;
		border-radius: 28rpx;
		background: #ffe3ec;
		font-size: 48rpx;
	}

	.forgot-hero__title {
		display: block;
		color: #2b151e;
		font-size: 44rpx;
		font-weight: 800;
	}

	.forgot-hero__subtitle {
		display: block;
		margin-top: 10rpx;
		color: #7a5462;
		font-size: 23rpx;
		line-height: 1.6;
	}

	.show-row {
		margin: -8rpx 0 18rpx;
		color: #a52c5f;
		font-size: 22rpx;
		text-align: right;
		font-weight: 600;
	}

	.forgot-note {
		margin-top: 24rpx;
		padding: 22rpx;
		border-radius: 24rpx;
		background: #fff0f5;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.65;
	}

	.forgot-note text {
		display: block;
	}
</style>
