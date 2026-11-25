<template>
	<view class="privacy-page">
		<qj-top-bar back title="隐私说明" />

		<view class="qj-page qj-page--sub">
			<view class="privacy-hero">
				<view class="privacy-hero__emoji">🛡️</view>
				<view class="qj-grow">
					<text class="privacy-hero__title">你的账本，只属于你</text>
					<text class="privacy-hero__subtitle">轻记 v1.1.1 · 更新于 2026-11-24</text>
				</view>
			</view>

			<view class="qj-card privacy-card">
				<text class="privacy-section__title">1. 数据边界</text>
				<text class="privacy-section__body">
					轻记只做个人记账，不收集邮箱、手机号、通讯录、位置或通讯内容。账号只使用用户名和密码。
				</text>
			</view>

			<view class="qj-card privacy-card">
				<text class="privacy-section__title">2. 账号与会话</text>
				<text class="privacy-section__body">
					密码使用 Argon2id 哈希保存，服务端不保存明文。登录成功后，后端创建 30 天会话并通过 HttpOnly Cookie 保存凭证；前端只缓存用户名、注册时间等公开信息，不保存密码或会话 Token。
				</text>
				<view class="privacy-list">
					<text>· 注册时可生成一次性恢复码，用于找回密码</text>
					<text>· 修改密码会吊销其他设备上的会话</text>
					<text>· 连续登录失败会触发短时限制</text>
				</view>
			</view>

			<view class="qj-card privacy-card">
				<text class="privacy-section__title">3. 账目数据</text>
				<text class="privacy-section__body">
					当前版本的账目写入项目本地 MySQL，按账号隔离。登录只证明身份，不等于多设备云同步；数据库只运行在本地开发环境时，账目不会自动上传到第三方云服务。
				</text>
			</view>

			<view class="qj-card privacy-card">
				<text class="privacy-section__title">4. 备份与剪贴板</text>
				<text class="privacy-section__body">
					导出备份时，备份内容会复制到系统剪贴板；剪贴板可能被其他应用读取。请在可信设备上操作，并在使用后及时清除剪贴板。多端版本暂不直接写入文件。
				</text>
			</view>

			<view class="qj-card privacy-card">
				<text class="privacy-section__title">5. 风险提示</text>
				<text class="privacy-section__body">
					本地部署需要自行保护数据库、后端服务和设备安全。生产环境应启用 HTTPS、设置 Secure Cookie、限制 CORS 来源，并定期备份数据库。任何声称“绝对安全”的记账服务都值得再确认一次。
				</text>
			</view>

			<view class="privacy-actions">
				<button class="qj-btn qj-btn--primary qj-btn--block" @tap="goHome">进入我的账本</button>
				<button class="qj-btn qj-btn--ghost qj-btn--block privacy-actions__login" @tap="goLogin">返回登录</button>
			</view>

			<view class="privacy-footer">
				<text>🍑 轻记 · 把每一笔轻轻收好</text>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'

	export default {
		components: { QjTopBar },
		methods: {
			goHome() {
				uni.reLaunch({ url: '/pages/index/index' })
			},
			goLogin() {
				uni.reLaunch({ url: '/pages/login/login' })
			}
		}
	}
</script>

<style scoped>
	.privacy-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 100% 0%, rgba(255, 208, 225, 0.5), transparent 28%),
			#fff7f9;
	}

	.privacy-hero {
		display: flex;
		align-items: center;
		padding: 14rpx 8rpx 24rpx;
	}

	.privacy-hero__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 92rpx;
		height: 92rpx;
		margin-right: 18rpx;
		border-radius: 30rpx;
		background: #ffe3ec;
		font-size: 46rpx;
	}

	.privacy-hero__title {
		display: block;
		color: #2b151e;
		font-size: 38rpx;
		font-weight: 800;
	}

	.privacy-hero__subtitle {
		display: block;
		margin-top: 5rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.privacy-card {
		padding: 26rpx 28rpx;
	}

	.privacy-section__title {
		display: block;
		margin-bottom: 10rpx;
		color: #a52c5f;
		font-size: 26rpx;
		font-weight: 700;
	}

	.privacy-section__body {
		display: block;
		color: #5f3d4a;
		font-size: 23rpx;
		line-height: 1.75;
	}

	.privacy-list {
		display: flex;
		flex-direction: column;
		margin-top: 10rpx;
		color: #7a5462;
		font-size: 22rpx;
		line-height: 1.75;
	}

	.privacy-actions {
		margin-top: 28rpx;
	}

	.privacy-actions__login {
		margin-top: 14rpx;
	}

	.privacy-footer {
		padding: 34rpx 0 10rpx;
		color: #b99aa5;
		font-size: 21rpx;
		text-align: center;
	}
</style>
