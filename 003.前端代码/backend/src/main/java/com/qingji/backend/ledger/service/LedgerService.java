package com.qingji.backend.ledger.service;

import com.qingji.backend.common.ApiException;
import com.qingji.backend.ledger.dto.CategoryResponse;
import com.qingji.backend.ledger.dto.CreateTransactionRequest;
import com.qingji.backend.ledger.dto.TransactionResponse;
import com.qingji.backend.ledger.mapper.LedgerBootstrapMapper;
import com.qingji.backend.ledger.mapper.LedgerCategoryMapper;
import com.qingji.backend.ledger.mapper.LedgerTransactionMapper;
import com.qingji.backend.ledger.model.CategoryRow;
import com.qingji.backend.ledger.model.TransactionRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class LedgerService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private final LedgerBootstrapMapper bootstrapMapper;
    private final LedgerCategoryMapper categoryMapper;
    private final LedgerTransactionMapper transactionMapper;

    public LedgerService(LedgerBootstrapMapper bootstrapMapper,
                         LedgerCategoryMapper categoryMapper,
                         LedgerTransactionMapper transactionMapper) {
        this.bootstrapMapper = bootstrapMapper;
        this.categoryMapper = categoryMapper;
        this.transactionMapper = transactionMapper;
    }

    public List<CategoryResponse> categories(String userId) {
        ensureUserData(userId);
        return categoryMapper.findTopLevel(userId).stream()
                .filter(category -> !category.isHidden())
                .map(CategoryResponse::from)
                .toList();
    }

    public List<TransactionResponse> transactions(String userId, LocalDate from, LocalDate to) {
        ensureUserData(userId);
        if (from == null || to == null) {
            LocalDate today = LocalDate.now(BUSINESS_ZONE);
            from = today.withDayOfMonth(1);
            to = today.withDayOfMonth(today.lengthOfMonth());
        }
        if (from.isAfter(to)) {
            throw ApiException.badRequest("开始日期不能晚于结束日期");
        }
        return transactionMapper.findByRange(userId, from, to).stream()
                .map(TransactionResponse::from)
                .toList();
    }

    @Transactional
    public TransactionResponse create(String userId, CreateTransactionRequest request) {
        ensureUserData(userId);

        String type = request.type();
        if (!"expense".equals(type) && !"income".equals(type)) {
            throw ApiException.badRequest("收支类型必须是 expense 或 income");
        }
        if (request.amountCents() == null || request.amountCents() < 1) {
            throw ApiException.badRequest("金额必须大于 0");
        }

        CategoryRow category = categoryMapper.findOwnedById(userId, request.categoryId());
        if (category == null || category.isHidden()) {
            throw ApiException.badRequest("分类不存在或已被隐藏");
        }
        if (!category.getType().equals(type)) {
            throw ApiException.badRequest("分类类型与账目类型不一致");
        }

        LocalDate occurredOn = request.occurredOn() == null
                ? LocalDate.now(BUSINESS_ZONE)
                : request.occurredOn();
        String note = request.note() == null ? "" : request.note().trim();
        if (note.length() > 200) {
            throw ApiException.badRequest("备注最多 200 个字符");
        }

        String id = UUID.randomUUID().toString();
        transactionMapper.insert(
                id,
                userId,
                UUID.randomUUID().toString(),
                type,
                request.amountCents(),
                request.categoryId(),
                note,
                occurredOn
        );

        TransactionRow row = transactionMapper.findOwnedById(userId, id);
        if (row == null) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "server_error", "账目保存后无法读取");
        }
        return TransactionResponse.from(row);
    }

    private void ensureUserData(String userId) {
        if (categoryMapper.countByUser(userId) == 0) {
            bootstrapMapper.bootstrapUser(userId);
        }
    }
}
