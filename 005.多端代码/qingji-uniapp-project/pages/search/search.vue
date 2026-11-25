<template>
	<view class="search-page">
		<qj-top-bar back title="搜索" />

		<view class="qj-page qj-page--sub">
			<view class="search-box">
				<text class="search-box__icon">⌕</text>
				<input
					v-model="keyword"
					class="search-box__input"
					type="text"
					confirm-type="search"
					focus
					placeholder="搜索备注、分类或日期"
					placeholder-class="qj-placeholder"
				/>
				<text v-if="keyword" class="search-box__clear" @tap="keyword = ''">×</text>
			</view>

			<view class="search-toolbar">
				<view class="filter-chips">
					<view class="qj-chip" :class="{ 'is-active': type === 'all' }" @tap="type = 'all'">全部</view>
					<view class="qj-chip" :class="{ 'is-active': type === 'expense' }" @tap="type = 'expense'">支出</view>
					<view class="qj-chip" :class="{ 'is-active': type === 'income' }" @tap="type = 'income'">收入</view>
				</view>
				<text class="search-toolbar__hint">近 12 个月</text>
			</view>

			<view v-if="loading" class="qj-loading">正在搜索账本…</view>

			<template v-else>
				<view class="search-summary">
					<text>找到 <text class="qj-primary qj-strong">{{ filtered.length }}</text> 笔</text>
					<text v-if="keyword" class="qj-muted">关键词「{{ keyword }}」</text>
				</view>

				<view v-if="!filtered.length" class="qj-card">
					<view class="qj-empty">
						<text class="qj-empty__emoji">🔎</text>
						<text class="qj-empty__title">{{ keyword ? '没有找到相关账目' : '输入关键词开始搜索' }}</text>
						<text>{{ keyword ? '换个分类、备注或日期试试。' : '可以搜索分类名、备注内容或日期。' }}</text>
					</view>
				</view>

				<view v-for="group in groups" :key="group.date" class="search-group">
					<view class="search-group__head">
						<text class="search-group__date">{{ group.label }}</text>
						<text class="search-group__week">{{ group.weekday }}</text>
					</view>
					<view class="qj-card search-card">
						<view v-for="tx in group.items" :key="tx.id" class="search-row" @tap="showTransaction(tx)">
							<view class="search-row__emoji" :style="{ background: softColor(tx.categoryColor) }">
								{{ categoryEmoji(tx.categoryIcon, tx.category) }}
							</view>
							<view class="qj-grow">
								<text class="search-row__name">{{ tx.category }}</text>
								<text class="search-row__note">{{ tx.note || '没有备注' }}</text>
							</view>
							<view class="search-row__right">
								<text class="search-row__amount qj-num" :class="tx.type === 'income' ? 'qj-tag-income' : 'qj-tag-expense'">
									{{ privacy ? '••••' : (tx.type === 'income' ? '+' : '-') + '¥' + money(tx.amountCents) }}
								</text>
								<text class="search-row__date">{{ tx.date }}</text>
							</view>
						</view>
					</view>
				</view>
			</template>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { requireUser } from '../../common/auth.js'
	import { ledger, rangeForSearch } from '../../common/ledger.js'
	import { STORAGE_KEYS } from '../../common/config.js'
	import { money, groupByDate, categoryEmoji, safeError } from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				loading: true,
				keyword: '',
				type: 'all',
				rows: [],
				privacy: false
			}
		},
		computed: {
			filtered() {
				const keyword = String(this.keyword || '').trim().toLowerCase()
				return this.rows.filter((item) => {
					if (this.type !== 'all' && item.type !== this.type) return false
					if (!keyword) return true
					const haystack = [
						item.category,
						item.note,
						item.date,
						item.type === 'income' ? '收入' : '支出',
						money(item.amountCents)
					].join(' ').toLowerCase()
					return haystack.includes(keyword)
				})
			},
			groups() {
				return groupByDate(this.filtered)
			}
		},
		onLoad() {
			this.privacy = Boolean(uni.getStorageSync(STORAGE_KEYS.privacy))
			this.load()
		},
		methods: {
			money,
			categoryEmoji,
			softColor(color) {
				return color ? `${color}22` : '#fdf1f5'
			},
			async load() {
				const user = await requireUser()
				if (!user) return
				this.loading = true
				try {
					const range = rangeForSearch()
					this.rows = await ledger.listRange(range.from, range.to)
				} catch (error) {
					uni.showToast({ title: safeError(error), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			showTransaction(tx) {
				uni.showModal({
					title: `${tx.category} · ${tx.type === 'income' ? '+' : '-'}¥${money(tx.amountCents)}`,
					content: `${tx.date}\n${tx.note || '没有备注'}`,
					showCancel: false,
					confirmText: '知道了'
				})
			}
		}
	}
</script>

<style scoped>
	.search-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 100% 0%, rgba(255, 208, 225, 0.5), transparent 28%),
			#fff7f9;
	}

	.search-box {
		display: flex;
		align-items: center;
		height: 92rpx;
		padding: 0 24rpx;
		margin-bottom: 18rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 8rpx 24rpx rgba(165, 44, 95, 0.05);
	}

	.search-box__icon {
		margin-right: 12rpx;
		color: #a98996;
		font-size: 38rpx;
		font-weight: 300;
	}

	.search-box__input {
		flex: 1;
		height: 88rpx;
		color: #2b151e;
		font-size: 28rpx;
	}

	.search-box__clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44rpx;
		height: 44rpx;
		border-radius: 50%;
		background: #fdf1f5;
		color: #a98996;
		font-size: 30rpx;
	}

	.search-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}

	.filter-chips {
		display: flex;
	}

	.search-toolbar__hint {
		color: #a98996;
		font-size: 20rpx;
	}

	.search-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 8rpx 12rpx;
		color: #7a5462;
		font-size: 22rpx;
	}

	.search-group {
		margin-top: 18rpx;
	}

	.search-group__head {
		display: flex;
		align-items: center;
		padding: 0 8rpx 8rpx;
	}

	.search-group__date {
		color: #5f3d4a;
		font-size: 23rpx;
		font-weight: 700;
	}

	.search-group__week {
		margin-left: 10rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.search-card {
		padding: 4rpx 24rpx;
	}

	.search-row {
		display: flex;
		align-items: center;
		padding: 18rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.search-row:last-child {
		border-bottom: 0;
	}

	.search-row__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 70rpx;
		height: 70rpx;
		margin-right: 16rpx;
		border-radius: 22rpx;
		font-size: 34rpx;
	}

	.search-row__name {
		display: block;
		color: #2b151e;
		font-size: 26rpx;
		font-weight: 600;
	}

	.search-row__note {
		display: block;
		margin-top: 3rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.search-row__right {
		margin-left: 14rpx;
		text-align: right;
	}

	.search-row__amount {
		display: block;
		font-size: 26rpx;
		font-weight: 700;
	}

	.search-row__date {
		display: block;
		margin-top: 3rpx;
		color: #b99aa5;
		font-size: 18rpx;
	}
</style>
