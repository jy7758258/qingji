<template>
	<view class="home-page">
		<qj-top-bar brand search settings add @search="openSearch" @settings="openSettings" @add="openRecord" />

		<view class="qj-page">
			<view v-if="loading" class="qj-loading">正在翻开小账本…</view>

			<template v-else>
				<view class="hero-card">
					<view class="hero-card__peach">🍑</view>
					<view class="qj-between">
						<text class="hero-card__label">{{ currentMonthLabel }} · 支出</text>
						<view class="hero-card__pill">{{ privacy ? '隐私模式' : '本地账本' }}</view>
					</view>
					<text class="hero-card__amount qj-num">{{ privacy ? '••••••' : '¥' + money(summary.expenseCents) }}</text>

					<view class="hero-card__mini">
						<view class="hero-card__mini-item">
							<text class="hero-card__mini-label">收入</text>
							<text class="hero-card__mini-value qj-num">{{ privacy ? '••••' : '¥' + money(summary.incomeCents) }}</text>
						</view>
						<view class="hero-card__mini-item">
							<text class="hero-card__mini-label">结余</text>
							<text class="hero-card__mini-value qj-num">{{ privacy ? '••••' : '¥' + money(summary.balanceCents) }}</text>
						</view>
						<view class="hero-card__mini-item">
							<text class="hero-card__mini-label">笔数</text>
							<text class="hero-card__mini-value qj-num">{{ summary.count }}</text>
						</view>
					</view>

					<view class="hero-card__tip">
						<text>{{ compareTip }}</text>
					</view>
				</view>

				<view v-if="topCategories.length" class="qj-card category-card">
					<view class="qj-section-title">
						<text>本月花在哪</text>
						<text class="qj-section-title__hint">支出分类 Top {{ topCategories.length }}</text>
					</view>
					<view v-for="item in topCategories" :key="item.id" class="category-line">
						<view class="category-line__emoji" :style="{ background: softColor(item.color) }">{{ item.emoji }}</view>
						<view class="qj-grow">
							<view class="qj-between category-line__head">
								<text class="category-line__name">{{ item.name }}</text>
								<text class="category-line__amount qj-num">{{ privacy ? '••••' : '¥' + money(item.amountCents) }}</text>
							</view>
							<view class="category-line__track">
								<view class="category-line__bar" :style="{ width: item.percent + '%', background: item.color }"></view>
							</view>
						</view>
					</view>
				</view>

				<view class="qj-section-title">
					<text>最近明细</text>
					<text class="qj-section-title__hint">{{ transactions.length }} 笔</text>
				</view>

				<view v-if="!groups.length" class="qj-card">
					<view class="qj-empty">
						<text class="qj-empty__emoji">🍡</text>
						<text class="qj-empty__title">这个月还没有账目</text>
						<text>记录第一笔，让每一笔都有去处。</text>
						<view class="empty-action">
							<button class="qj-btn qj-btn--primary qj-btn--small" @tap="openRecord">记一笔</button>
						</view>
					</view>
				</view>

				<view v-for="group in groups" :key="group.date" class="day-group">
					<view class="day-group__head">
						<view class="qj-row">
							<text class="day-group__date">{{ group.label }}</text>
							<text class="day-group__week">{{ group.weekday }}</text>
						</view>
						<text class="day-group__total qj-num">
							{{ group.incomeCents ? '+' + money(group.incomeCents) : '' }}
							{{ group.expenseCents ? (group.incomeCents ? ' · ' : '') + '-' + money(group.expenseCents) : '' }}
						</text>
					</view>

					<view class="qj-card transaction-card">
						<view v-for="tx in group.items" :key="tx.id" class="tx-row" @tap="showTransaction(tx)">
							<view class="tx-row__emoji" :style="{ background: softColor(tx.categoryColor) }">
								{{ categoryEmoji(tx.categoryIcon, tx.category) }}
							</view>
							<view class="qj-grow">
								<text class="tx-row__name">{{ tx.category }}</text>
								<text class="tx-row__note">{{ tx.note || '没有备注' }} · {{ dateTimeLabel(tx.createdAt) }}</text>
							</view>
							<text class="tx-row__amount qj-num" :class="tx.type === 'income' ? 'qj-tag-income' : 'qj-tag-expense'">
								{{ privacy ? '••••' : (tx.type === 'income' ? '+' : '-') + '¥' + money(tx.amountCents) }}
							</text>
						</view>
					</view>
				</view>

				<view v-if="groups.length" class="home-end">
					<text>🍑 小桃帮你把每一笔都收好了</text>
				</view>
			</template>
		</view>

		<qj-tab-bar active="home" />
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import QjTabBar from '../../components/QjTabBar.vue'
	import { requireUser } from '../../common/auth.js'
	import { ledger } from '../../common/ledger.js'
	import { STORAGE_KEYS } from '../../common/config.js'
	import {
		money,
		monthKey,
		monthLabel,
		shiftMonth,
		groupByDate,
		categoryEmoji,
		categoryColor,
		dateTimeLabel,
		clampPercent,
		safeError
	} from '../../common/format.js'

	export default {
		components: { QjTopBar, QjTabBar },
		data() {
			return {
				loading: true,
				month: monthKey(),
				transactions: [],
				groups: [],
				topCategories: [],
				summary: {
					expenseCents: 0,
					incomeCents: 0,
					balanceCents: 0,
					count: 0
				},
				previousExpenseCents: 0,
				privacy: false
			}
		},
		computed: {
			currentMonthLabel() {
				return monthLabel(this.month)
			},
			compareTip() {
				if (!this.previousExpenseCents && !this.summary.expenseCents) {
					return '从今天开始，轻轻记下每一笔。'
				}
				if (!this.previousExpenseCents) {
					return `本月已记 ${this.summary.count} 笔，继续保持记录的好习惯。`
				}
				const diff = this.summary.expenseCents - this.previousExpenseCents
				if (diff === 0) return '和上月支出持平，稳稳的。'
				if (diff < 0) return `比上月少花 ¥${money(Math.abs(diff))}，很不错。`
				return `比上月多花 ¥${money(diff)}，留意一下小开销。`
			}
		},
		onShow() {
			this.privacy = Boolean(uni.getStorageSync(STORAGE_KEYS.privacy))
			this.load()
		},
		onPullDownRefresh() {
			this.load().finally(() => uni.stopPullDownRefresh())
		},
		methods: {
			money,
			categoryEmoji,
			dateTimeLabel,
			softColor(color) {
				if (!color) return '#fdf1f5'
				return `${color}22`
			},
			async load() {
				const user = await requireUser()
				if (!user) return
				this.loading = true
				try {
					const [current, previous] = await Promise.all([
						ledger.listMonth(this.month),
						ledger.listMonth(shiftMonth(this.month, -1))
					])
					this.transactions = current
					this.groups = groupByDate(current)
					this.previousExpenseCents = previous
						.filter((item) => item.type === 'expense')
						.reduce((sum, item) => sum + item.amountCents, 0)
					this.buildSummary(current)
					this.buildTopCategories(current)
				} catch (error) {
					uni.showToast({ title: safeError(error), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			buildSummary(rows) {
				const expenseCents = rows
					.filter((item) => item.type === 'expense')
					.reduce((sum, item) => sum + item.amountCents, 0)
				const incomeCents = rows
					.filter((item) => item.type === 'income')
					.reduce((sum, item) => sum + item.amountCents, 0)
				this.summary = {
					expenseCents,
					incomeCents,
					balanceCents: incomeCents - expenseCents,
					count: rows.length
				}
			},
			buildTopCategories(rows) {
				const map = {}
				rows.filter((item) => item.type === 'expense').forEach((item) => {
					if (!map[item.categoryId]) {
						map[item.categoryId] = {
							id: item.categoryId,
							name: item.category,
							icon: item.categoryIcon,
							color: categoryColor({ icon: item.categoryIcon, color: item.categoryColor }),
							emoji: categoryEmoji(item.categoryIcon, item.category),
							amountCents: 0
						}
					}
					map[item.categoryId].amountCents += item.amountCents
				})
				const list = Object.values(map).sort((a, b) => b.amountCents - a.amountCents).slice(0, 4)
				const total = this.summary.expenseCents || 1
				this.topCategories = list.map((item) => ({
					...item,
					percent: clampPercent((item.amountCents / total) * 100)
				}))
			},
			openRecord() {
				uni.navigateTo({ url: '/pages/record/record' })
			},
			openSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			openSettings() {
				uni.reLaunch({ url: '/pages/settings/settings' })
			},
			showTransaction(tx) {
				const sign = tx.type === 'income' ? '+' : '-'
				uni.showModal({
					title: `${tx.category} · ${sign}¥${money(tx.amountCents)}`,
					content: `${tx.date}\n${tx.note || '没有备注'}\n记录于 ${dateTimeLabel(tx.createdAt)}`,
					showCancel: false,
					confirmText: '知道了'
				})
			}
		}
	}
</script>

<style scoped>
	.home-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 100% -4%, rgba(255, 208, 225, 0.62), transparent 32%),
			#fff7f9;
	}

	.hero-card {
		position: relative;
		overflow: hidden;
		padding: 32rpx 30rpx 26rpx;
		border-radius: 38rpx;
		background: linear-gradient(135deg, #e86193 0%, #c44379 55%, #a52c5f 100%);
		box-shadow: 0 18rpx 44rpx rgba(165, 44, 95, 0.22);
		color: #ffffff;
	}

	.hero-card__peach {
		position: absolute;
		top: -18rpx;
		right: 20rpx;
		font-size: 150rpx;
		line-height: 1;
		opacity: 0.18;
		transform: rotate(10deg);
	}

	.hero-card__label {
		position: relative;
		color: rgba(255, 255, 255, 0.86);
		font-size: 24rpx;
		font-weight: 600;
	}

	.hero-card__pill {
		position: relative;
		padding: 6rpx 16rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.3);
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.9);
		font-size: 20rpx;
	}

	.hero-card__amount {
		position: relative;
		display: block;
		margin: 12rpx 0 24rpx;
		font-size: 66rpx;
		font-weight: 800;
		letter-spacing: 1rpx;
		line-height: 1.15;
	}

	.hero-card__mini {
		position: relative;
		display: flex;
		padding: 18rpx 0;
		border-top: 1rpx solid rgba(255, 255, 255, 0.18);
		border-bottom: 1rpx solid rgba(255, 255, 255, 0.18);
	}

	.hero-card__mini-item {
		flex: 1;
	}

	.hero-card__mini-item + .hero-card__mini-item {
		border-left: 1rpx solid rgba(255, 255, 255, 0.18);
		padding-left: 22rpx;
	}

	.hero-card__mini-label {
		display: block;
		color: rgba(255, 255, 255, 0.72);
		font-size: 20rpx;
	}

	.hero-card__mini-value {
		display: block;
		margin-top: 4rpx;
		font-size: 27rpx;
		font-weight: 700;
	}

	.hero-card__tip {
		position: relative;
		margin-top: 18rpx;
		color: rgba(255, 255, 255, 0.86);
		font-size: 21rpx;
		line-height: 1.5;
	}

	.category-card {
		margin-top: 22rpx;
	}

	.category-line {
		display: flex;
		align-items: center;
		padding: 12rpx 0;
	}

	.category-line__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 62rpx;
		height: 62rpx;
		margin-right: 18rpx;
		border-radius: 20rpx;
		font-size: 32rpx;
	}

	.category-line__head {
		margin-bottom: 8rpx;
	}

	.category-line__name {
		color: #3f2a33;
		font-size: 24rpx;
		font-weight: 600;
	}

	.category-line__amount {
		color: #5f3d4a;
		font-size: 23rpx;
		font-weight: 700;
	}

	.category-line__track {
		overflow: hidden;
		height: 10rpx;
		border-radius: 999rpx;
		background: #f7e4eb;
	}

	.category-line__bar {
		height: 100%;
		border-radius: 999rpx;
	}

	.day-group {
		margin-top: 24rpx;
	}

	.day-group__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 8rpx 10rpx;
	}

	.day-group__date {
		color: #5f3d4a;
		font-size: 24rpx;
		font-weight: 700;
	}

	.day-group__week {
		margin-left: 10rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.day-group__total {
		color: #a98996;
		font-size: 21rpx;
	}

	.transaction-card {
		padding: 4rpx 24rpx;
	}

	.tx-row {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.tx-row:last-child {
		border-bottom: 0;
	}

	.tx-row__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 74rpx;
		height: 74rpx;
		margin-right: 18rpx;
		border-radius: 24rpx;
		font-size: 36rpx;
	}

	.tx-row__name {
		display: block;
		color: #2b151e;
		font-size: 28rpx;
		font-weight: 600;
	}

	.tx-row__note {
		display: block;
		margin-top: 3rpx;
		color: #a98996;
		font-size: 21rpx;
	}

	.tx-row__amount {
		margin-left: 16rpx;
		font-size: 28rpx;
		font-weight: 700;
	}

	.home-end {
		padding: 38rpx 0 8rpx;
		color: #b99aa5;
		font-size: 21rpx;
		text-align: center;
	}

	.empty-action {
		margin-top: 22rpx;
	}
</style>
