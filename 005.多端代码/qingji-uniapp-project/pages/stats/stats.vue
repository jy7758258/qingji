<template>
	<view class="stats-page">
		<qj-top-bar title="统计" add @add="openRecord" />

		<view class="qj-page">
			<view class="stats-toolbar">
				<view class="segment segment--period">
					<view class="segment__item" :class="{ 'is-active': period === 'month' }" @tap="changePeriod('month')">本月</view>
					<view class="segment__item" :class="{ 'is-active': period === 'year' }" @tap="changePeriod('year')">今年</view>
				</view>
				<view class="segment segment--type">
					<view class="segment__item" :class="{ 'is-active': type === 'expense' }" @tap="changeType('expense')">支出</view>
					<view class="segment__item" :class="{ 'is-active': type === 'income' }" @tap="changeType('income')">收入</view>
				</view>
			</view>

			<view v-if="loading" class="qj-loading">正在整理账本…</view>

			<template v-else>
				<view class="stats-hero">
					<view class="qj-between">
						<text class="stats-hero__label">{{ periodLabel }} · {{ type === 'expense' ? '总支出' : '总收入' }}</text>
						<view class="stats-hero__pill">{{ rows.length }} 笔</view>
					</view>
					<text class="stats-hero__amount qj-num">{{ privacy ? '••••••' : '¥' + money(totalCents) }}</text>
					<view class="stats-hero__meta">
						<view class="stats-hero__meta-item">
							<text class="stats-hero__meta-label">笔均</text>
							<text class="stats-hero__meta-value qj-num">{{ privacy ? '••••' : '¥' + money(averageCents) }}</text>
						</view>
						<view class="stats-hero__meta-item">
							<text class="stats-hero__meta-label">最高一笔</text>
							<text class="stats-hero__meta-value qj-num">{{ privacy ? '••••' : '¥' + money(maxAmountCents) }}</text>
						</view>
						<view class="stats-hero__meta-item">
							<text class="stats-hero__meta-label">分类</text>
							<text class="stats-hero__meta-value qj-num">{{ categoryRows.length }} 个</text>
						</view>
					</view>
				</view>

				<view v-if="!rows.length" class="qj-card">
					<view class="qj-empty">
						<text class="qj-empty__emoji">📊</text>
						<text class="qj-empty__title">还没有可统计的数据</text>
						<text>先记下一笔，统计会自己长出来。</text>
						<view class="empty-action">
							<button class="qj-btn qj-btn--primary qj-btn--small" @tap="openRecord">去记一笔</button>
						</view>
					</view>
				</view>

				<template v-else>
					<view class="qj-card">
						<view class="qj-section-title">
							<text>分类排行</text>
							<text class="qj-section-title__hint">{{ type === 'expense' ? '钱都花在哪' : '收入从哪来' }}</text>
						</view>
						<view v-for="(item, index) in categoryRows" :key="item.id" class="rank-row">
							<text class="rank-row__index">{{ index + 1 }}</text>
							<view class="rank-row__emoji" :style="{ background: softColor(item.color) }">{{ item.emoji }}</view>
							<view class="qj-grow">
								<view class="qj-between">
									<text class="rank-row__name">{{ item.name }}</text>
									<text class="rank-row__amount qj-num">{{ privacy ? '••••' : '¥' + money(item.amountCents) }}</text>
								</view>
								<view class="rank-row__track">
									<view class="rank-row__bar" :style="{ width: item.percent + '%', background: item.color }"></view>
								</view>
								<text class="rank-row__percent">{{ item.percent.toFixed(1) }}% · {{ item.count }} 笔</text>
							</view>
						</view>
					</view>

					<view class="qj-card">
						<view class="qj-section-title">
							<text>{{ period === 'month' ? '本月每日' : '今年每月' }}{{ type === 'expense' ? '支出' : '收入' }}</text>
							<text class="qj-section-title__hint">点柱子看详情</text>
						</view>
						<view class="trend">
							<view
								v-for="bar in trend"
								:key="bar.key"
								class="trend__item"
								@tap="showBar(bar)"
							>
								<view class="trend__track">
									<view
										class="trend__bar"
										:style="{ height: bar.height + 'rpx', background: type === 'expense' ? '#e87ba4' : '#2f7d6d' }"
									></view>
								</view>
								<text class="trend__label">{{ bar.showLabel ? bar.label : '' }}</text>
							</view>
						</view>
					</view>

					<view class="qj-card insight-card">
						<view class="qj-section-title">
							<text>小桃观察</text>
							<text class="qj-section-title__hint">来自你的账本</text>
						</view>
						<view class="insight-row">
							<text class="insight-row__emoji">🍑</text>
							<text>{{ insightText }}</text>
						</view>
						<view class="insight-row">
							<text class="insight-row__emoji">{{ type === 'expense' ? '💡' : '🌱' }}</text>
							<text>{{ suggestionText }}</text>
						</view>
					</view>
				</template>
			</template>
		</view>

		<qj-tab-bar active="stats" />
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import QjTabBar from '../../components/QjTabBar.vue'
	import { requireUser } from '../../common/auth.js'
	import { ledger, rangeForStats } from '../../common/ledger.js'
	import { STORAGE_KEYS } from '../../common/config.js'
	import {
		money,
		monthKey,
		monthLabel,
		yearLabel,
		categoryEmoji,
		categoryColor,
		clampPercent,
		safeError
	} from '../../common/format.js'

	export default {
		components: { QjTopBar, QjTabBar },
		data() {
			return {
				loading: true,
				period: 'month',
				type: 'expense',
				source: [],
				rows: [],
				categoryRows: [],
				trend: [],
				totalCents: 0,
				averageCents: 0,
				maxAmountCents: 0,
				topCategory: null,
				peakBar: null,
				privacy: false
			}
		},
		computed: {
			periodLabel() {
				return this.period === 'month' ? monthLabel(monthKey()) : yearLabel(monthKey())
			},
			topShare() {
				if (!this.topCategory || !this.totalCents) return 0
				return (this.topCategory.amountCents / this.totalCents) * 100
			},
			insightText() {
				if (!this.topCategory) return '还没有足够的数据，先多记几笔吧。'
				const percent = this.topShare.toFixed(1)
				if (this.type === 'expense') {
					return `${this.periodLabel}里，${this.topCategory.name}占支出的 ${percent}%，是你最大的开销来源。`
				}
				return `${this.periodLabel}里，${this.topCategory.name}贡献了 ${percent}% 的收入。`
			},
			suggestionText() {
				if (!this.rows.length) return '记录本身就是在理解自己，慢慢来。'
				if (this.type === 'expense' && this.topShare >= 45) {
					return `${this.topCategory.name}占比偏高，可以看看是否有可替代的小选项。`
				}
				if (this.type === 'income') return '收入稳稳积累，也别忘了给未来的自己留一点。'
				return '分类花得比较均匀，继续保持记录，月底会更有数。'
			}
		},
		onShow() {
			this.privacy = Boolean(uni.getStorageSync(STORAGE_KEYS.privacy))
			this.load()
		},
		methods: {
			money,
			softColor(color) {
				return color ? `${color}22` : '#fdf1f5'
			},
			async load() {
				const user = await requireUser()
				if (!user) return
				this.loading = true
				try {
					const range = rangeForStats()
					this.source = await ledger.listRange(range.from, range.to)
					this.rebuild()
				} catch (error) {
					uni.showToast({ title: safeError(error), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			changePeriod(period) {
				if (this.period === period) return
				this.period = period
				this.rebuild()
			},
			changeType(type) {
				if (this.type === type) return
				this.type = type
				this.rebuild()
			},
			periodPrefix() {
				return this.period === 'month' ? monthKey() : String(monthKey()).slice(0, 4)
			},
			rebuild() {
				const prefix = this.periodPrefix()
				const rows = this.source.filter((item) => (
					item.type === this.type && item.date && item.date.startsWith(prefix)
				))
				this.rows = rows
				this.totalCents = rows.reduce((sum, item) => sum + item.amountCents, 0)
				this.averageCents = rows.length ? Math.round(this.totalCents / rows.length) : 0
				this.maxAmountCents = rows.reduce((max, item) => Math.max(max, item.amountCents), 0)
				this.buildCategories(rows)
				this.buildTrend(rows)
			},
			buildCategories(rows) {
				const map = {}
				rows.forEach((item) => {
					if (!map[item.categoryId]) {
						map[item.categoryId] = {
							id: item.categoryId,
							name: item.category,
							color: categoryColor({ icon: item.categoryIcon, color: item.categoryColor }),
							emoji: categoryEmoji(item.categoryIcon, item.category),
							amountCents: 0,
							count: 0
						}
					}
					map[item.categoryId].amountCents += item.amountCents
					map[item.categoryId].count += 1
				})
				const total = this.totalCents || 1
				const list = Object.values(map)
					.sort((a, b) => b.amountCents - a.amountCents)
					.map((item) => ({
						...item,
						percent: clampPercent((item.amountCents / total) * 100)
					}))
				this.categoryRows = list
				this.topCategory = list.length ? list[0] : null
			},
			buildTrend(rows) {
				const isMonth = this.period === 'month'
				const now = new Date()
				const count = isMonth ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : 12
				const buckets = []

				for (let index = 0; index < count; index += 1) {
					const key = isMonth
						? `${monthKey()}-${String(index + 1).padStart(2, '0')}`
						: `${now.getFullYear()}-${String(index + 1).padStart(2, '0')}`
					buckets.push({
						key,
						label: isMonth ? String(index + 1) : `${index + 1}月`,
						value: 0,
						count: 0,
						showLabel: isMonth
							? (index === 0 || (index + 1) % 5 === 0 || index === count - 1)
							: true
					})
				}

				rows.forEach((item) => {
					const bucket = isMonth
						? buckets.find((entry) => entry.key === item.date)
						: buckets.find((entry) => item.date.startsWith(entry.key))
					if (bucket) {
						bucket.value += item.amountCents
						bucket.count += 1
					}
				})

				const max = buckets.reduce((value, bucket) => Math.max(value, bucket.value), 0) || 1
				this.trend = buckets.map((bucket) => ({
					...bucket,
					height: Math.max(6, Math.round((bucket.value / max) * 150))
				}))
				const peak = buckets.reduce((best, bucket) => (bucket.value > (best ? best.value : 0) ? bucket : best), null)
				this.peakBar = peak && peak.value ? peak : null
			},
			showBar(bar) {
				uni.showModal({
					title: `${bar.label}${this.type === 'expense' ? '支出' : '收入'}`,
					content: `¥${money(bar.value)}，共 ${bar.count} 笔。`,
					showCancel: false,
					confirmText: '知道了'
				})
			},
			openRecord() {
				uni.navigateTo({ url: '/pages/record/record' })
			}
		}
	}
</script>

<style scoped>
	.stats-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 98% 0%, rgba(255, 208, 225, 0.55), transparent 30%),
			#fff7f9;
	}

	.stats-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.segment {
		display: flex;
		padding: 5rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 999rpx;
		background: #ffffff;
	}

	.segment--period {
		flex: 1;
		max-width: 320rpx;
	}

	.segment__item {
		flex: 1;
		padding: 13rpx 20rpx;
		border-radius: 999rpx;
		color: #7a5462;
		font-size: 23rpx;
		text-align: center;
	}

	.segment__item.is-active {
		background: #ffe3ec;
		color: #a52c5f;
		font-weight: 700;
	}

	.stats-hero {
		padding: 30rpx;
		border-radius: 36rpx;
		background: linear-gradient(135deg, #fff0f5, #ffffff 72%);
		border: 1rpx solid #f3d6e0;
		box-shadow: 0 12rpx 40rpx rgba(165, 44, 95, 0.06);
	}

	.stats-hero__label {
		color: #7a5462;
		font-size: 23rpx;
		font-weight: 600;
	}

	.stats-hero__pill {
		padding: 5rpx 14rpx;
		border-radius: 999rpx;
		background: #ffe3ec;
		color: #a52c5f;
		font-size: 20rpx;
	}

	.stats-hero__amount {
		display: block;
		margin: 10rpx 0 22rpx;
		color: #a52c5f;
		font-size: 62rpx;
		font-weight: 800;
	}

	.stats-hero__meta {
		display: flex;
		padding-top: 18rpx;
		border-top: 1rpx solid #f3d6e0;
	}

	.stats-hero__meta-item {
		flex: 1;
	}

	.stats-hero__meta-label {
		display: block;
		color: #a98996;
		font-size: 20rpx;
	}

	.stats-hero__meta-value {
		display: block;
		margin-top: 4rpx;
		color: #5f3d4a;
		font-size: 24rpx;
		font-weight: 700;
	}

	.rank-row {
		display: flex;
		align-items: flex-start;
		padding: 16rpx 0;
	}

	.rank-row__index {
		width: 32rpx;
		padding-top: 18rpx;
		color: #b99aa5;
		font-size: 22rpx;
		font-weight: 700;
		text-align: center;
	}

	.rank-row__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 66rpx;
		height: 66rpx;
		margin: 0 16rpx;
		border-radius: 20rpx;
		font-size: 30rpx;
	}

	.rank-row__name {
		color: #3f2a33;
		font-size: 24rpx;
		font-weight: 600;
	}

	.rank-row__amount {
		color: #5f3d4a;
		font-size: 23rpx;
		font-weight: 700;
	}

	.rank-row__track {
		overflow: hidden;
		height: 10rpx;
		margin-top: 8rpx;
		border-radius: 999rpx;
		background: #f7e4eb;
	}

	.rank-row__bar {
		height: 100%;
		border-radius: 999rpx;
	}

	.rank-row__percent {
		display: block;
		margin-top: 5rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.trend {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		height: 204rpx;
		padding-top: 10rpx;
	}

	.trend__item {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.trend__track {
		display: flex;
		flex: 1;
		align-items: flex-end;
		justify-content: center;
		width: 100%;
	}

	.trend__bar {
		width: 58%;
		max-width: 18rpx;
		min-height: 6rpx;
		border-radius: 8rpx 8rpx 2rpx 2rpx;
		opacity: 0.86;
	}

	.trend__label {
		height: 28rpx;
		margin-top: 6rpx;
		color: #b99aa5;
		font-size: 16rpx;
		line-height: 28rpx;
		white-space: nowrap;
	}

	.insight-card {
		margin-bottom: 8rpx;
	}

	.insight-row {
		display: flex;
		align-items: flex-start;
		padding: 10rpx 0;
		color: #5f3d4a;
		font-size: 23rpx;
		line-height: 1.6;
	}

	.insight-row__emoji {
		margin-right: 10rpx;
	}

	.empty-action {
		margin-top: 22rpx;
	}
</style>
