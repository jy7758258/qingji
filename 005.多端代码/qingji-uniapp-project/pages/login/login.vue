<template>
	<view class="auth-page" :style="{ paddingTop: (statusBarHeight + 54) + 'px' }">
		<view class="auth-brand">
			<view class="auth-brand__peach">🍑</view>
			<view>
				<text class="auth-brand__name">轻记</text>
				<text class="auth-brand__slogan">把每一笔，轻轻记下来</text>
			</view>
		</view>

		<view class="auth-hero">
			<text class="auth-hero__title">欢迎回来</text>
			<text class="auth-hero__subtitle">登录后继续查看你的小账本</text>
		</view>

		<view class="qj-card auth-card">
			<view class="qj-field">
				<text class="qj-label">用户名</text>
				<input
					v-model="username"
					class="qj-input"
					type="text"
					maxlength="20"
					placeholder="请输入用户名"
					placeholder-class="qj-placeholder"
					confirm-type="next"
				/>
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
						placeholder="请输入密码"
						placeholder-class="qj-placeholder"
						confirm-type="done"
						@confirm="submit"
					/>
					<text class="password-toggle" @tap="showPassword = !showPassword">
						{{ showPassword ? '隐藏' : '显示' }}
					</text>
				</view>
			</view>

			<view v-if="error" class="qj-error">{{ error }}</view>

			<button
				class="qj-btn qj-btn--primary qj-btn--block"
				:disabled="loading"
				@tap="submit"
			>
				{{ loading ? '登录中…' : '登录' }}
			</button>

			<view class="auth-links">
				<text class="qj-link" @tap="goRegister">注册新账号</text>
				<text class="auth-links__dot">·</text>
				<text class="qj-link" @tap="goForgot">忘记密码</text>
			</view>
		</view>

		<view class="auth-note">
			<text>登录即表示你同意</text>
			<text class="qj-link" @tap="goPrivacy">《隐私说明》</text>
			<text>。账号与账目保存在本地服务中。</text>
		</view>
	</view>
</template>

<script>
	import { login, me, currentUser } from '../../common/auth.js'
	import { safeError } from '../../common/format.js'

	export default {
		data() {
			return {
				statusBarHeight: 0,
				username: '',
				password: '',
				showPassword: false,
				loading: false,
				checking: false,
				error: ''
			}
		},
		onLoad() {
			try {
				this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
			} catch (error) {
				this.statusBarHeight = 0
			}
			this.checkExisting()
		},
		onShow() {
			if (!this.checking) this.checkExisting()
		},
		methods: {
			async checkExisting() {
				if (!currentUser()) return
				this.checking = true
				try {
					const user = await me()
					if (user) uni.reLaunch({ url: '/pages/index/index' })
				} catch (error) {
					// 网络异常时仍展示登录表单
				} finally {
					this.checking = false
				}
			},
			async submit() {
				if (this.loading) return
				this.error = ''
				const username = String(this.username || '').trim()
				if (!username) {
					this.error = '请输入用户名'
					return
				}
				if (!this.password) {
					this.error = '请输入密码'
					return
				}
				this.loading = true
				try {
					await login(username, this.password)
					uni.showToast({ title: '登录成功', icon: 'success' })
					setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 250)
				} catch (error) {
					this.error = safeError(error)
				} finally {
					this.loading = false
				}
			},
			goRegister() {
				uni.navigateTo({ url: '/pages/register/register' })
			},
			goForgot() {
				uni.navigateTo({ url: '/pages/forgot/forgot' })
			},
			goPrivacy() {
				uni.navigateTo({ url: '/pages/privacy/privacy' })
			}
		}
	}
</script>

<style scoped>
	.auth-page {
		min-height: 100vh;
		padding-right: 40rpx;
		padding-left: 40rpx;
		padding-bottom: 60rpx;
		background:
			radial-gradient(circle at 92% 8%, rgba(255, 208, 225, 0.8), transparent 34%),
			linear-gradient(180deg, #fff7f9 0%, #fff0f4 54%, #fff7f9 100%);
	}

	.auth-brand {
		display: flex;
		align-items: center;
		margin-bottom: 78rpx;
	}

	.auth-brand__peach {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 104rpx;
		height: 104rpx;
		margin-right: 18rpx;
		border-radius: 34rpx;
		background: #ffffff;
		font-size: 62rpx;
		box-shadow: 0 14rpx 36rpx rgba(165, 44, 95, 0.1);
	}

	.auth-brand__name {
		display: block;
		color: #2b151e;
		font-size: 40rpx;
		font-weight: 800;
		letter-spacing: 4rpx;
	}

	.auth-brand__slogan {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 22rpx;
	}

	.auth-hero {
		margin-bottom: 28rpx;
	}

	.auth-hero__title {
		display: block;
		color: #2b151e;
		font-size: 54rpx;
		font-weight: 800;
		line-height: 1.2;
	}

	.auth-hero__subtitle {
		display: block;
		margin-top: 10rpx;
		color: #7a5462;
		font-size: 26rpx;
	}

	.auth-card {
		padding: 38rpx 32rpx 30rpx;
		border-radius: 36rpx;
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

	.auth-links {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 30rpx;
		font-size: 24rpx;
	}

	.auth-links__dot {
		margin: 0 16rpx;
		color: #c9aab6;
	}

	.auth-note {
		margin-top: 28rpx;
		padding: 0 10rpx;
		color: #a98996;
		font-size: 21rpx;
		line-height: 1.6;
		text-align: center;
	}
</style>
