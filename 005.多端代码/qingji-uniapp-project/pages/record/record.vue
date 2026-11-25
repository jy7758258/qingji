<template>
	<view class="record-page">
		<qj-top-bar back title="记一笔" />

		<view class="qj-page qj-page--sub">
			<view class="type-switch">
				<view
					class="type-switch__item"
					:class="{ 'is-active': type === 'expense' }"
					@tap="changeType('expense')"
				>
					支出
				</view>
				<view
					class="type-switch__item"
					:class="{ 'is-active': type === 'income' }"
					@tap="changeType('income')"
				>
					收入
				</view>
			</view>

			<view class="amount-card">
				<text class="amount-card__label">{{ type === 'expense' ? '这笔花了多少' : '这笔收入多少' }}</text>
				<view class="amount-card__input-row">
					<text class="amount-card__currency">¥</text>
					<input
						v-model="amount"
						class="amount-card__input qj-num"
						type="digit"
						maxlength="10"
						placeholder="0.00"
						placeholder-class="amount-card__placeholder"
						confirm-type="done"
					/>
				</view>
				<view class="quick-list">
					<view v-for="item in quickAmounts" :key="item" class="quick-chip" @tap="quickAdd(item)">
						+{{ item }}
					</view>
					<view class="quick-chip quick-chip--clear" @tap="amount = ''">清零</view>
				</view>
			</view>

			<view class="qj-card">
				<view class="qj-between">
					<text class="record-title">选择分类</text>
					<text class="qj-tiny qj-faint">{{ visibleCategories.length }} 个分类</text>
				</view>

				<view v-if="!categoriesLoading && !visibleCategories.length" class="qj-empty">
					<text class="qj-empty__emoji">🧺</text>
					<text>还没有可用分类，请先在分类管理中创建。</text>
				</view>

				<view v-else class="category-grid">
					<view
						v-for="category in visibleCategories"
						:key="category.id"
						class="category-item"
						:class="{ 'is-active': selectedCategoryId === category.id }"
						@tap="selectedCategoryId = category.id"
					>
						<view
							class="category-item__emoji"
							:style="{ background: selectedCategoryId === category.id ? softColor(category.color) : '#fdf1f5' }"
						>
							{{ categoryEmoji(category.icon, category.name) }}
						</view>
						<text class="category-item__name">{{ category.name }}</text>
					</view>
				</view>
			</view>

			<view class="qj-card">
				<view class="qj-field">
					<text class="qj-label">日期</text>
					<picker mode="date" :value="date" :end="today" @change="onDateChange">
						<view class="date-picker">
							<view class="qj-row">
								<text class="date-picker__icon">📅</text>
								<text class="date-picker__value">{{ dateLabel }}{{ date === today ? ' · 今天' : '' }}</text>
							</view>
							<text class="qj-arrow">›</text>
						</view>
					</picker>
				</view>

				<view class="qj-field">
					<text class="qj-label">备注</text>
					<textarea
						v-model="note"
						class="qj-textarea"
						maxlength="200"
						auto-height
						placeholder="写点什么，方便以后想起来（选填）"
						placeholder-class="qj-placeholder"
					/>
					<text class="qj-help">{{ note.length }}/200</text>
				</view>
			</view>

			<view class="qj-card month-card">
				<view class="qj-section-title">
					<text>本月概览</text>
					<text class="qj-section-title__hint">{{ monthTitle }}</text>
				</view>
				<view class="month-card__row">
					<view class="month-card__item">
						<text class="month-card__label">支出</text>
						<text class="month-card__value qj-num">¥{{ money(monthExpense) }}</text>
					</view>
					<view class="month-card__item">
						<text class="month-card__label">收入</text>
						<text class="month-card__value month-card__value--green qj-num">¥{{ money(monthIncome) }}</text>
					</view>
					<view class="month-card__item">
						<text class="month-card__label">今日已记</text>
						<text class="month-card__value qj-num">{{ todayCount }} 笔</text>
					</view>
				</view>
			</view>

			<view v-if="error" class="qj-error">{{ error }}</view>

			<view class="record-actions">
				<button
					class="qj-btn qj-btn--primary qj-btn--block"
					:disabled="saving"
					@tap="save(false)"
				>
					{{ saving ? '保存中…' : '保存这笔' }}
				</button>
				<button
					class="qj-btn qj-btn--soft qj-btn--block record-actions__again"
					:disabled="saving"
					@tap="save(true)"
				>
					保存并再记一笔
				</button>
			</view>

			<view class="record-tip">
				<text>🍑 小提示：记账日期默认今天，可以手动改成更早的日期。</text>
			</view>
		</view>
	</view>
</template>

<script>
	import QjTopBar from '../../components/QjTopBar.vue'
	import { ledger } from '../../common/ledger.js'
	import { requireUser } from '../../common/auth.js'
	import { STORAGE_KEYS } from '../../common/config.js'
	import {
		money,
		todayKey,
		monthKey,
		monthLabel,
		weekdayLabel,
		categoryEmoji,
		safeError
	} from '../../common/format.js'

	export default {
		components: { QjTopBar },
		data() {
			return {
				type: 'expense',
				amount: '',
				note: '',
				date: todayKey(),
				today: todayKey(),
				categories: [],
				selectedCategoryId: '',
				categoriesLoading: true,
				monthTransactions: [],
				saving: false,
				error: ''
			}
		},
		computed: {
			visibleCategories() {
				return this.categories
					.filter((item) => !item.hidden && item.type === this.type)
					.sort((a, b) => (a.sort || 0) - (b.sort || 0))
			},
			dateLabel() {
				const weekday = weekdayLabel(this.date)
				return weekday ? `${this.date} ${weekday}` : this.date
			},
			monthTitle() {
				return monthLabel(monthKey())
			},
			monthExpense() {
				return this.monthTransactions
					.filter((item) => item.type === 'expense')
					.reduce((sum, item) => sum + item.amountCents, 0)
			},
			monthIncome() {
				return this.monthTransactions
					.filter((item) => item.type === 'income')
					.reduce((sum, item) => sum + item.amountCents, 0)
			},
			todayCount() {
				return this.monthTransactions.filter((item) => item.date === this.today).length
			},
			quickAmounts() {
				return this.type === 'expense' ? [20, 35, 50, 100] : [100, 500, 1000, 5000]
			}
		},
		onLoad() {
			const lastType = uni.getStorageSync(STORAGE_KEYS.lastType)
			if (lastType === 'income' || lastType === 'expense') this.type = lastType
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
				this.categoriesLoading = true
				try {
					const [categories, transactions] = await Promise.all([
						ledger.listCategories(),
						ledger.listMonth()
					])
					this.categories = categories
					this.monthTransactions = transactions
					this.ensureSelectedCategory()
				} catch (error) {
					this.error = safeError(error)
					uni.showToast({ title: safeError(error), icon: 'none' })
				} finally {
					this.categoriesLoading = false
				}
			},
			ensureSelectedCategory() {
				const list = this.visibleCategories
				if (!list.some((item) => item.id === this.selectedCategoryId)) {
					this.selectedCategoryId = list.length ? list[0].id : ''
				}
			},
			changeType(type) {
				if (this.type === type) return
				this.type = type
				uni.setStorageSync(STORAGE_KEYS.lastType, type)
				this.ensureSelectedCategory()
			},
			quickAdd(value) {
				const current = Number(this.amount || 0)
				this.amount = (current + value).toFixed(2)
			},
			onDateChange(event) {
				this.date = event.detail.value
			},
			validate() {
				const amountValue = Number(this.amount)
				if (!this.amount || Number.isNaN(amountValue) || amountValue <= 0) {
					return '请输入大于 0 的金额'
				}
				if (amountValue > 9999999.99) {
					return '单笔金额不能超过 ¥9,999,999.99'
				}
				if (!this.selectedCategoryId) {
					return '请选择一个分类'
				}
				return ''
			},
			async save(again) {
				if (this.saving) return
				this.error = this.validate()
				if (this.error) return

				this.saving = true
				try {
					const cents = Math.round(Number(this.amount) * 100)
					const tx = await ledger.createTransaction({
						type: this.type,
						amountCents: cents,
						categoryId: this.selectedCategoryId,
						note: String(this.note || '').trim(),
						occurredOn: this.date
					})
					this.monthTransactions = [tx, ...this.monthTransactions]

					if (again) {
						this.amount = ''
						this.note = ''
						uni.showToast({ title: '已记下，继续记', icon: 'success' })
					} else {
						uni.showToast({ title: '记好了', icon: 'success' })
						setTimeout(() => {
							uni.navigateBack({
								delta: 1,
								fail: () => uni.reLaunch({ url: '/pages/index/index' })
							})
						}, 350)
					}
				} catch (error) {
					this.error = safeError(error)
				} finally {
					this.saving = false
				}
			}
		}
	}
</script>

<style scoped>
	.record-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at 4% 0%, rgba(255, 208, 225, 0.55), transparent 26%),
			#fff7f9;
	}

	.type-switch {
		display: flex;
		padding: 6rpx;
		margin-bottom: 20rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 999rpx;
		background: #ffffff;
	}

	.type-switch__item {
		flex: 1;
		padding: 20rpx 0;
		border-radius: 999rpx;
		color: #7a5462;
		font-size: 26rpx;
		text-align: center;
		font-weight: 600;
	}

	.type-switch__item.is-active {
		background: #ffe3ec;
		color: #a52c5f;
		font-weight: 700;
	}

	.amount-card {
		padding: 28rpx 30rpx 24rpx;
		margin-bottom: 22rpx;
		border-radius: 34rpx;
		background: #ffffff;
		border: 1rpx solid #f3d6e0;
		box-shadow: 0 12rpx 40rpx rgba(165, 44, 95, 0.06);
	}

	.amount-card__label {
		display: block;
		color: #7a5462;
		font-size: 23rpx;
	}

	.amount-card__input-row {
		display: flex;
		align-items: center;
		min-height: 100rpx;
	}

	.amount-card__currency {
		margin-right: 10rpx;
		color: #a52c5f;
		font-size: 42rpx;
		font-weight: 700;
	}

	.amount-card__input {
		flex: 1;
		height: 100rpx;
		color: #2b151e;
		font-size: 66rpx;
		font-weight: 800;
	}

	.amount-card__placeholder {
		color: #d8c0ca;
	}

	.quick-list {
		display: flex;
		flex-wrap: wrap;
		margin-top: 12rpx;
	}

	.quick-chip {
		margin: 8rpx 12rpx 0 0;
		padding: 10rpx 20rpx;
		border-radius: 999rpx;
		background: #fff7fa;
		color: #a52c5f;
		font-size: 22rpx;
		font-weight: 600;
	}

	.quick-chip--clear {
		color: #a98996;
		background: #fdf1f5;
	}

	.record-title {
		color: #3f2a33;
		font-size: 26rpx;
		font-weight: 700;
	}

	.category-grid {
		display: flex;
		flex-wrap: wrap;
		margin: 10rpx -8rpx 0;
	}

	.category-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 25%;
		padding: 14rpx 0;
	}

	.category-item__emoji {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 82rpx;
		height: 82rpx;
		border: 2rpx solid transparent;
		border-radius: 28rpx;
		font-size: 38rpx;
		transition: all 0.15s ease;
	}

	.category-item.is-active .category-item__emoji {
		border-color: #e86193;
		box-shadow: 0 6rpx 14rpx rgba(165, 44, 95, 0.12);
		transform: scale(1.06);
	}

	.category-item__name {
		width: 100%;
		margin-top: 8rpx;
		overflow: hidden;
		color: #7a5462;
		font-size: 20rpx;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.category-item.is-active .category-item__name {
		color: #a52c5f;
		font-weight: 700;
	}

	.date-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 88rpx;
		padding: 0 24rpx;
		border: 1rpx solid #f3d6e0;
		border-radius: 22rpx;
		background: #fff7fa;
	}

	.date-picker__icon {
		margin-right: 12rpx;
		font-size: 30rpx;
	}

	.date-picker__value {
		color: #5f3d4a;
		font-size: 26rpx;
	}

	.month-card {
		margin-top: 22rpx;
	}

	.month-card__row {
		display: flex;
		padding-top: 6rpx;
	}

	.month-card__item {
		flex: 1;
	}

	.month-card__label {
		display: block;
		color: #a98996;
		font-size: 21rpx;
	}

	.month-card__value {
		display: block;
		margin-top: 6rpx;
		color: #5f3d4a;
		font-size: 26rpx;
		font-weight: 700;
	}

	.month-card__value--green {
		color: #2f7d6d;
	}

	.record-actions {
		margin-top: 26rpx;
	}

	.record-actions__again {
		margin-top: 16rpx;
	}

	.record-tip {
		margin-top: 20rpx;
		color: #b99aa5;
		font-size: 21rpx;
		text-align: center;
	}
</style>
