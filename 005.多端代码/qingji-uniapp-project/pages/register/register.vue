<template>
	<view class="register-page">
		<qj-top-bar back title="注册" />
		<view class="register-body">
			<view class="auth-hero">
				<text class="auth-hero__title">创建小账本</text>
				<text class="auth-hero__subtitle">只需要用户名和密码，不收集邮箱与手机号</text>
			</view>

			<view class="qj-card auth-card">
				<view class="qj-field">
					<text class="qj-label">用户名</text>
					<input
						v-model="username"
						class="qj-input"
						type="text"
						maxlength="20"
						placeholder="2–20 位，中文 / 字母 / 数字"
						placeholder-class="qj-placeholder"
					/>
					<text class="qj-help">用户名不区分大小写，注册后不可修改。</text>
				</view>

				<view class="qj-field">
					<text class="qj-label">密码</text>
					<view class="password-wrap">
						<input
							v-model="password"
							class="qj-input password-input"
							:password="!showPassword"
							type="text"
							maxlength="64"
							placeholder="8–64 位，需同时包含字母和数字"
							placeholder-class="qj-placeholder"
						/>
						<text class="password-toggle" @tap="showPassword = !showPassword">
							{{ showPassword ? '隐藏' : '显示' }}
						</text>
					</view>
				</view>

				<view class="qj-field">
					<text class="qj-label">确认密码</text>
					<input
						v-model="confirmPassword"
						class="qj-input"
						:password="!showPassword"
						type="text"
						maxlength="64"
						placeholder="再输入一次密码"
						placeholder-class="qj-placeholder"
					/>
				</view>

				<view class="agree-row" @tap="agreed = !agreed">
					<view class="agree-box" :class="{ 'is-checked': agreed }">
						<text v-if="agreed">✓</text>
					</view>
					<view class="agree-text">
						<text>我已阅读并同意</text>
						<text class="qj-link" @tap.stop="goPrivacy">《隐私说明》</text>
						<text>，了解数据只保存在本地服务中。</text>
					</view>
				</view>

				<view v-if="error" class="qj-error">{{ error }}</view>

				<button
					class="qj-btn qj-btn--primary qj-btn--block"
					:disabled="loading"
					@tap="submit"
				>
					{{ loading ? '创建中…' : '创建账号' }}
				</button>

				<view class="auth-links">
					<text class="qj-muted">已有账号？</text>
					<text class="qj-link" @tap="goLogin">去登录</text>
				</view>
			</view>

			<view class="register-tip">
				<text class="register-tip__icon">🔐</text>
				<text>注册成功后会生成一次性的恢复码，请务必保存；忘记密码时需要它。</text>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { register, currentUser } from '../../common/auth.js'
	import { safeError } from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				username: '',
				password: '',
				confirmPassword: '',
				showPassword: false,
				agreed: false,
				loading: false,
				error: ''
			}
		},
		onLoad() {
			if (currentUser()) {
				uni.reLaunch({ url: '/pages/index/index' })
			}
		},
		methods: {
			validate() {
				const username = String(this.username || '').trim()
				if (!/^[一-龥A-Za-z0-9_]{2,20}$/.test(username)) {
					return '用户名需为 2–20 位中文、字母、数字或下划线'
				}
				if (this.password.length < 8 || this.password.length > 64) {
					return '密码长度需为 8–64 位'
				}
				if (!/[A-Za-z]/.test(this.password) || !/\d/.test(this.password)) {
					return '密码需同时包含字母和数字'
				}
				if (this.password !== this.confirmPassword) {
					return '两次输入的密码不一致'
				}
				if (!this.agreed) {
					return '请先阅读并同意隐私说明'
				}
				return ''
			},
			async submit() {
				if (this.loading) return
				this.error = this.validate()
				if (this.error) return

				this.loading = true
				try {
					const result = await register(String(this.username).trim(), this.password)
					const code = result && result.recoveryCode ? result.recoveryCode : ''
					if (code) {
						uni.setClipboardData({ data: code })
					}
					uni.showModal({
						title: '账号创建成功',
						content: code
							? `你的恢复码是：\n${code}\n\n已复制到剪贴板，请妥善保存。忘记密码时需要它。`
							: '账号已创建，即将进入账本。',
						showCancel: false,
						confirmText: '进入账本',
						success: () => {
							uni.reLaunch({ url: '/pages/index/index' })
						}
					})
				} catch (error) {
					this.error = safeError(error)
				} finally {
					this.loading = false
				}
			},
			goPrivacy() {
				uni.navigateTo({ url: '/pages/privacy/privacy' })
			},
			goLogin() {
				uni.navigateBack({
					delta: 1,
					fail: () => uni.reLaunch({ url: '/pages/login/login' })
				})
			}
		}
	}
</script>

<style scoped>
	.register-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 96% 4%, rgba(255, 208, 225, 0.72), transparent 30%),
			#fff7f9;
	}

	.register-body {
		padding: 24rpx 40rpx 70rpx;
	}

	.auth-hero {
		margin: 16rpx 0 26rpx;
	}

	.auth-hero__title {
		display: block;
		color: #2b151e;
		font-size: 48rpx;
		font-weight: 800;
	}

	.auth-hero__subtitle {
		display: block;
		margin-top: 10rpx;
		color: #7a5462;
		font-size: 24rpx;
		line-height: 1.5;
	}

	.auth-card {
		padding: 32rpx 30rpx 28rpx;
	}

	.password-wrap {
		position: relative;
	}

	.password-input {
		padding-right: 112rpx;
	}

	.password-toggle {
		position: absolute;
		top: 0;
		right: 22rpx;
		bottom: 0;
		display: flex;
		align-items: center;
		color: #a52c5f;
		font-size: 22rpx;
		font-weight: 600;
	}

	.agree-row {
		display: flex;
		align-items: flex-start;
		margin: 4rpx 0 24rpx;
	}

	.agree-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34rpx;
		height: 34rpx;
		margin-top: 4rpx;
		margin-right: 14rpx;
		border: 2rpx solid #e9bfd0;
		border-radius: 10rpx;
		background: #ffffff;
		color: #ffffff;
		font-size: 22rpx;
		font-weight: 700;
	}

	.agree-box.is-checked {
		border-color: #e86193;
		background: #e86193;
	}

	.agree-text {
		flex: 1;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.55;
	}

	.auth-links {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 26rpx;
		font-size: 24rpx;
	}

	.register-tip {
		display: flex;
		align-items: flex-start;
		margin-top: 26rpx;
		padding: 20rpx 22rpx;
		border-radius: 22rpx;
		background: #fff0f5;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.6;
	}

	.register-tip__icon {
		margin-right: 10rpx;
	}
</style>
