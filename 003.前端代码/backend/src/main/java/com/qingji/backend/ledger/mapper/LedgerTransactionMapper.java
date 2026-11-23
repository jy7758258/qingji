package com.qingji.backend.ledger.mapper;

import com.qingji.backend.ledger.model.TransactionRow;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface LedgerTransactionMapper {

    @Insert("""
            INSERT INTO ledger_transactions
                (id, user_id, client_id, type, amount_cents, currency,
                 category_id, note, occurred_on, source)
            VALUES
                (#{id}, #{userId}, #{clientId}, #{type}, #{amountCents}, 'CNY',
                 #{categoryId}, #{note}, #{occurredOn}, 'manual')
            """)
    int insert(@Param("id") String id,
               @Param("userId") String userId,
               @Param("clientId") String clientId,
               @Param("type") String type,
               @Param("amountCents") long amountCents,
               @Param("categoryId") String categoryId,
               @Param("note") String note,
               @Param("occurredOn") LocalDate occurredOn);

    @Select("""
            SELECT t.id, t.type, t.amount_cents, t.category_id,
                   c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                   t.note, t.occurred_on, t.created_at
            FROM ledger_transactions t
            JOIN ledger_categories c ON c.id = t.category_id
            WHERE t.user_id = #{userId}
              AND t.deleted_at IS NULL
              AND t.occurred_on BETWEEN #{from} AND #{to}
            ORDER BY t.occurred_on DESC, t.created_at DESC
            """)
    List<TransactionRow> findByRange(@Param("userId") String userId,
                                     @Param("from") LocalDate from,
                                     @Param("to") LocalDate to);

    @Select("""
            SELECT t.id, t.type, t.amount_cents, t.category_id,
                   c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                   t.note, t.occurred_on, t.created_at
            FROM ledger_transactions t
            JOIN ledger_categories c ON c.id = t.category_id
            WHERE t.id = #{id}
              AND t.user_id = #{userId}
              AND t.deleted_at IS NULL
            """)
    TransactionRow findOwnedById(@Param("userId") String userId, @Param("id") String id);
}
