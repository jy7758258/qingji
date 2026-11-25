<template>
	<view class="categories-page">
		<qj-top-bar back title="分类管理" add @add="notOpen" />

		<view class="qj-page qj-page--sub">
			<view class="category-head">
				<view class="category-head__text">
					<text class="category-head__title">把日常分成小格子</text>
					<text class="category-head__subtitle">当前版本先展示服务端分类，编辑接口将在后续版本开放。</text>
				</view>
				<view class="category-head__peach">🍑</view>
			</view>

			<view class="type-tabs">
				<view class="type-tabs__item" :class="{ 'is-active': type === 'expense' }" @tap="type = 'expense'">
					支出分类
					<text class="type-tabs__count">{{ expenseCount }}</text>
				</view>
				<view class="type-tabs__item" :class="{ 'is-active': type === 'income' }" @tap="type = 'income'">
					收入分类
					<text class="type-tabs__count">{{ incomeCount }}</text>
				</view>
			</view>

			<view v-if="loading" class="qj-loading">正在整理分类…</view>

			<view v-else-if="!filtered.length" class="qj-card">
				<view class="qj-empty">
					<text class="qj-empty__emoji">🏷️</text>
					<text class="qj-empty__title">还没有分类</text>
					<text>首次打开记一笔时，服务端会自动初始化默认分类。</text>
				</view>
			</view>

			<view v-else class="qj-card category-list">
				<view v-for="category in filtered" :key="category.id" class="category-row" @tap="showCategory(category)">
					<view class="category-row__emoji" :style="{ background: softColor(category.color) }">
						{{ categoryEmoji(category.icon, category.name) }}
					</view>
					<view class="qj-grow">
						<view class="qj-row">
							<text class="category-row__name">{{ category.name }}</text>
							<text v-if="category.system" class="qj-pill category-row__system">默认</text>
						</view>
						<text class="category-row__desc">{{ type === 'expense' ? '支出' : '收入' }} · 排序 {{ category.sort }}</text>
					</view>
					<view class="category-row__dot" :style="{ background: categoryColor(category) }"></view>
				</view>
			</view>

			<view class="category-note">
				<text class="category-note__icon">🔒</text>
				<text>分类与账目都按账号隔离。隐藏、排序、新增二级分类等编辑能力需要后端分类接口，当前版本暂未开放。</text>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { requireUser } from '../../common/auth.js'
	import { ledger } from '../../common/ledger.js'
	import { categoryEmoji, categoryColor, safeError } from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				loading: true,
				type: 'expense',
				categories: []
			}
		},
		computed: {
			visible() {
				return this.categories.filter((item) => !item.hidden)
			},
			filtered() {
				return this.visible
					.filter((item) => item.type === this.type)
					.sort((a, b) => (a.sort || 0) - (b.sort || 0))
			},
			expenseCount() {
				return this.visible.filter((item) => item.type === 'expense').length
			},
			incomeCount() {
				return this.visible.filter((item) => item.type === 'income').length
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			categoryEmoji,
			categoryColor,
			softColor(color) {
				return color ? `${color}22` : '#fdf1f5'
			},
			async load() {
				const user = await requireUser()
				if (!user) return
				this.loading = true
				try {
					this.categories = await ledger.listCategories()
				} catch (error) {
					uni.showToast({ title: safeError(error), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			showCategory(category) {
				uni.showModal({
					title: category.name,
					content: `${category.type === 'income' ? '收入' : '支出'}分类${category.system ? ' · 系统默认' : ''}\n分类颜色：${category.color || '未设置'}`,
					showCancel: false,
					confirmText: '知道了'
				})
			},
			notOpen() {
				uni.showModal({
					title: '新增分类',
					content: '当前后端只提供分类读取接口，新增与编辑分类将在后续版本开放。',
					showCancel: false,
					confirmText: '知道了'
				})
			}
		}
	}
</script>

<style scoped>
	.categories-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 100% 0%, rgba(255, 208, 225, 0.55), transparent 30%),
			#fff7f9;
	}

	.category-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 8rpx 26rpx;
	}

	.category-head__text {
		flex: 1;
		padding-right: 20rpx;
	}

	.category-head__title {
		display: block;
		color: #2b151e;
		font-size: 40rpx;
		font-weight: 800;
	}

	.category-head__subtitle {
		display: block;
		margin-top: 6rpx;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.6;
	}

	.category-head__peach {
		font-size: 84rpx;
		line-height: 1;
		opacity: 0.52;
	}

	.type-tabs {
		display: flex;
		padding: 6rpx;
		margin-bottom: 20rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 999rpx;
		background: #ffffff;
	}

	.type-tabs__item {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		padding: 18rpx 10rpx;
		border-radius: 999rpx;
		color: #7a5462;
		font-size: 25rpx;
		font-weight: 600;
	}

	.type-tabs__item.is-active {
		background: #ffe3ec;
		color: #a52c5f;
		font-weight: 700;
	}

	.type-tabs__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 34rpx;
		height: 34rpx;
		margin-left: 8rpx;
		padding: 0 8rpx;
		border-radius: 999rpx;
		background: rgba(165, 44, 95, 0.08);
		font-size: 18rpx;
	}

	.category-list {
		padding-top: 8rpx;
		padding-bottom: 8rpx;
	}

	.category-row {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f7e4eb;
	}

	.category-row:last-child {
		border-bottom: 0;
	}

	.category-row__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
		margin-right: 18rpx;
		border-radius: 24rpx;
		font-size: 34rpx;
	}

	.category-row__name {
		color: #2b151e;
		font-size: 27rpx;
		font-weight: 600;
	}

	.category-row__system {
		margin-left: 10rpx;
		padding: 3rpx 10rpx;
		font-size: 17rpx;
	}

	.category-row__desc {
		display: block;
		margin-top: 4rpx;
		color: #a98996;
		font-size: 20rpx;
	}

	.category-row__dot {
		width: 18rpx;
		height: 18rpx;
		margin-left: 16rpx;
		border-radius: 50%;
	}

	.category-note {
		display: flex;
		align-items: flex-start;
		margin-top: 22rpx;
		padding: 20rpx 22rpx;
		border-radius: 22rpx;
		background: #fff0f5;
		color: #7a5462;
		font-size: 21rpx;
		line-height: 1.65;
	}

	.category-note__icon {
		margin-right: 10rpx;
	}
</style>
