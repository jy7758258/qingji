<template>
	<view class="data-page">
		<qj-top-bar back title="数据与备份" />

		<view class="qj-page qj-page--sub">
			<view class="storage-card">
				<view class="storage-card__head">
					<view class="storage-card__icon">🗄️</view>
					<view class="qj-grow">
						<text class="storage-card__title">本地账本存储</text>
						<text class="storage-card__desc">MySQL · 按账号隔离</text>
					</view>
					<text class="qj-pill qj-pill--green">已连接</text>
				</view>
				<view class="storage-card__stats">
					<view class="storage-card__stat">
						<text class="storage-card__num qj-num">{{ transactions.length }}</text>
						<text class="storage-card__label">近两年账目</text>
					</view>
					<view class="storage-card__stat">
						<text class="storage-card__num qj-num">{{ categories.length }}</text>
						<text class="storage-card__label">可见分类</text>
					</view>
					<view class="storage-card__stat">
						<text class="storage-card__num qj-num">{{ lastDate || '—' }}</text>
						<text class="storage-card__label">最近一笔</text>
					</view>
				</view>
			</view>

			<view v-if="loading" class="qj-loading">正在读取数据…</view>

			<view class="qj-card">
				<view class="qj-section-title">
					<text>导出与备份</text>
					<text class="qj-section-title__hint">复制到剪贴板</text>
				</view>

				<view class="data-action" @tap="copyJson">
					<view class="data-action__icon">📋</view>
					<view class="qj-grow">
						<text class="data-action__title">复制 JSON 备份</text>
						<text class="data-action__desc">包含账号、分类与近两年账目</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>

				<view class="data-action" @tap="copyCsv">
					<view class="data-action__icon">📄</view>
					<view class="qj-grow">
						<text class="data-action__title">复制 CSV 表格</text>
						<text class="data-action__desc">可用 Excel / Numbers 打开</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>

				<view class="data-action" @tap="notOpen('导入备份')">
					<view class="data-action__icon">📥</view>
					<view class="qj-grow">
						<text class="data-action__title">导入备份</text>
						<text class="data-action__desc">当前后端暂未开放导入接口</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
			</view>

			<view class="qj-card">
				<view class="qj-section-title">
					<text>本机数据</text>
				</view>
				<view class="data-action" @tap="clearPreferences">
					<view class="data-action__icon">🧹</view>
					<view class="qj-grow">
						<text class="data-action__title">清除本机偏好缓存</text>
						<text class="data-action__desc">只清除隐私模式等偏好，不删除账目</text>
					</view>
					<text class="qj-arrow">›</text>
				</view>
				<view class="data-note">
					<text>账目保存在本地 MySQL 中，清理手机缓存不会删除账目；退出登录也不会删除账目。</text>
				</view>
			</view>

			<view class="backup-tip">
				<text class="backup-tip__icon">🍑</text>
				<text>多端版本暂不直接写文件。复制备份后，可以粘贴到备忘录、邮件或云盘保存。</text>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { currentUser, requireUser } from '../../common/auth.js'
	import { ledger, rangeForStats } from '../../common/ledger.js'
	import { STORAGE_KEYS } from '../../common/config.js'
	import { money, safeError } from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				loading: true,
				transactions: [],
				categories: []
			}
		},
		computed: {
			lastDate() {
				if (!this.transactions.length) return ''
				const sorted = [...this.transactions].sort((a, b) => (
					a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
				))
				return sorted[0].date
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				const user = await requireUser()
				if (!user) return
				this.loading = true
				try {
					const range = rangeForStats()
					const [transactions, categories] = await Promise.all([
						ledger.listRange(range.from, range.to),
						ledger.listCategories()
					])
					this.transactions = transactions
					this.categories = categories.filter((item) => !item.hidden)
				} catch (error) {
					uni.showToast({ title: safeError(error), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			async copyJson() {
				if (!this.transactions.length && !this.categories.length) {
					uni.showToast({ title: '还没有可备份的数据', icon: 'none' })
					return
				}
				const user = currentUser()
				const payload = {
					schema: 'qingji-backup',
					version: 1,
					exportedAt: new Date().toISOString(),
					user: user ? { username: user.username } : null,
					categories: this.categories,
					transactions: this.transactions.map((item) => ({
						id: item.id,
						type: item.type,
						amountCents: item.amountCents,
						categoryId: item.categoryId,
						category: item.category,
						note: item.note,
						date: item.date,
						createdAt: item.createdAt
					}))
				}
				this.copyText(JSON.stringify(payload, null, 2), 'JSON 备份已复制')
			},
			copyCsv() {
				if (!this.transactions.length) {
					uni.showToast({ title: '还没有可导出的账目', icon: 'none' })
					return
				}
				const header = ['日期', '类型', '分类', '金额', '备注']
				const lines = this.transactions
					.slice()
					.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
					.map((item) => [
						item.date,
						item.type === 'income' ? '收入' : '支出',
						item.category,
						money(item.amountCents),
						item.note || ''
					].map(this.csvCell).join(','))
				this.copyText([header.join(','), ...lines].join('\n'), 'CSV 已复制')
			},
			csvCell(value) {
				const text = String(value == null ? '' : value)
				if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
				return text
			},
			copyText(text, message) {
				uni.setClipboardData({
					data: text,
					success: () => {
						uni.showToast({ title: message, icon: 'success' })
					},
					fail: () => {
						uni.showToast({ title: '复制失败，请重试', icon: 'none' })
					}
				})
			},
			clearPreferences() {
				uni.showModal({
					title: '清除本机偏好',
					content: '会清除隐私模式、备份提醒和上次收支类型，不会删除账目。',
					confirmText: '清除',
					confirmColor: '#a9374a',
					success: (result) => {
						if (!result.confirm) return
						uni.removeStorageSync(STORAGE_KEYS.privacy)
						uni.removeStorageSync(STORAGE_KEYS.backupReminder)
						uni.removeStorageSync(STORAGE_KEYS.lastType)
						uni.showToast({ title: '已清除偏好', icon: 'success' })
					}
				})
			},
			notOpen(name) {
				uni.showModal({
					title: name,
					content: '当前版本的后端还没有开放这个接口。备份内容可以先通过剪贴板保存。',
					showCancel: false,
					confirmText: '知道了'
				})
			}
		}
	}
</script>

<style scoped>
	.data-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 4% 0%, rgba(255, 208, 225, 0.48), transparent 28%),
			#fff7f9;
	}

	.storage-card {
		padding: 28rpx;
		margin-bottom: 22rpx;
		border-radius: 34rpx;
		background: linear-gradient(135deg, #fff0f5, #ffffff 74%);
		border: 1rpx solid #f3d6e0;
		box-shadow: 0 12rpx 40rpx rgba(165, 44, 95, 0.06);
	}

	.storage-card__head {
		display: flex;
		align-items: center;
	}

	.storage-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 68rpx;
		height: 68rpx;
		margin-right: 16rpx;
		border-radius: 22rpx;
		background: #ffe3ec;
		font-size: 34rpx;
	}

	.storage-card__title {
		display: block;
		color: #2b151e;
		font-size: 28rpx;
		font-weight: 700;
	}

	.storage-card__desc {
		display: block;
		margin-top: 3rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.storage-card__stats {
		display: flex;
		margin-top: 22rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid #f3d6e0;
	}

	.storage-card__stat {
		flex: 1;
		text-align: center;
	}

	.storage-card__stat + .storage-card__stat {
		border-left: 1rpx solid #f3d6e0;
	}

	.storage-card__num {
		display: block;
		color: #a52c5f;
		font-size: 30rpx;
		font-weight: 800;
	}

	.storage-card__label {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 19rpx;
	}

	.data-action {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.data-action:last-child {
		border-bottom: 0;
	}

	.data-action__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		margin-right: 16rpx;
		border-radius: 20rpx;
		background: #fdf1f5;
		font-size: 32rpx;
	}

	.data-action__title {
		display: block;
		color: #2b151e;
		font-size: 26rpx;
		font-weight: 600;
	}

	.data-action__desc {
		display: block;
		margin-top: 3rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.data-note {
		margin-top: 12rpx;
		padding: 16rpx 18rpx;
		border-radius: 18rpx;
		background: #fff7fa;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.6;
	}

	.backup-tip {
		display: flex;
		align-items: flex-start;
		margin-top: 22rpx;
		padding: 20rpx 22rpx;
		border-radius: 22rpx;
		background: #fff0f5;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.6;
	}

	.backup-tip__icon {
		margin-right: 10rpx;
	}
</style>
